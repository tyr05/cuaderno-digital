// frontend/src/pages/Estudiantes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "../components/Shell";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPostForm } from "../api";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Table, THead, TRow, TH, TD } from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";

const TURNO_TODOS = "todos";
const DIVISION_TODAS = "todas";

function resolveTurno(curso) {
  return curso?.turno?.trim() || "Sin turno";
}

function resolveDivision(curso) {
  return curso?.division?.trim() || "Sin división";
}

export default function Estudiantes() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState(TURNO_TODOS);
  const [division, setDivision] = useState(DIVISION_TODAS);
  const [importingFor, setImportingFor] = useState(null);
  const [resumenes, setResumenes] = useState({});

  const toast = useToast();
  const toastShow = toast?.show;

  const autorizado = user?.rol === "admin" || user?.rol === "docente";

  useEffect(() => {
    if (!autorizado) {
      setCursos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const data = await apiGet("/api/cursos");
        setCursos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("No se pudieron cargar los cursos", error);
        toastShow?.(error?.error || "No se pudieron cargar los cursos", "error");
        setCursos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [autorizado, toastShow]);

  async function importarAlumnos(file, cursoId) {
    if (!file || !cursoId) return;

    setImportingFor(cursoId);
    const formData = new FormData();
    formData.append("archivo", file);

    try {
      const { curso, resumen } = await apiPostForm(`/api/cursos/${cursoId}/importar-alumnos`, formData);

      if (curso?._id) {
        setCursos((prev) =>
          prev.map((item) => (item._id === curso._id ? curso : item)),
        );
      }

      if (resumen) {
        setResumenes((prev) => ({ ...prev, [cursoId]: resumen }));
        const mensaje =
          resumen.procesados === 0
            ? "No se encontraron filas para importar"
            : `Importación completada: ${resumen.vinculados} agregados, ${resumen.creados} nuevos.`;
        toastShow?.(mensaje, "success");
        if (resumen.omitidos?.length) {
          toastShow?.(
            `${resumen.omitidos.length} fila(s) omitida(s) por faltar datos. Revisá el detalle en el curso.`,
            "error",
          );
        }
      }
    } catch (error) {
      console.error("Error importando alumnos", error);
      toastShow?.(error?.error || "No se pudo importar la lista", "error");
    } finally {
      setImportingFor(null);
    }
  }

  const tabs = useMemo(() => {
    const base = [
      { to: "/", label: "Inicio" },
      { to: "/asistencia", label: "Asistencia" },
    ];
    if (autorizado) {
      base.push({ to: "/estudiantes", label: "Estudiantes" });
    }
    return base;
  }, [autorizado]);

  const turnos = useMemo(() => {
    const collator = new Intl.Collator("es", { sensitivity: "base" });
    const set = new Set();
    cursos.forEach((curso) => {
      set.add(resolveTurno(curso));
    });
    return Array.from(set).sort(collator.compare);
  }, [cursos]);

  const divisiones = useMemo(() => {
    const collator = new Intl.Collator("es", { sensitivity: "base" });
    const set = new Set();
    cursos.forEach((curso) => {
      if (turno !== TURNO_TODOS && resolveTurno(curso) !== turno) return;
      set.add(resolveDivision(curso));
    });
    return Array.from(set).sort(collator.compare);
  }, [cursos, turno]);

  useEffect(() => {
    if (turno !== TURNO_TODOS && !turnos.includes(turno)) {
      setTurno(TURNO_TODOS);
    }
  }, [turno, turnos]);

  useEffect(() => {
    if (division !== DIVISION_TODAS && !divisiones.includes(division)) {
      setDivision(DIVISION_TODAS);
    }
  }, [division, divisiones]);

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso) => {
      const turnoCurso = resolveTurno(curso);
      const divisionCurso = resolveDivision(curso);

      const coincideTurno = turno === TURNO_TODOS || turnoCurso === turno;
      const coincideDivision =
        division === DIVISION_TODAS || divisionCurso === division;

      return coincideTurno && coincideDivision;
    });
  }, [cursos, turno, division]);

  const descripcion = autorizado
    ? "Visualizá el padrón de estudiantes y docentes asignados por curso."
    : "Acceso exclusivo para personal docente y administrativo.";

  if (!autorizado) {
    return (
      <Shell tabs={tabs} title="Estudiantes" description={descripcion}>
        <EmptyState
          title="Acceso restringido"
          desc="No contás con permisos para ver la nómina de estudiantes."
        />
      </Shell>
    );
  }

  return (
    <Shell tabs={tabs} title="Estudiantes" description={descripcion}>
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Turno"
            value={turno}
            onChange={(event) => setTurno(event.target.value)}
          >
            <option value={TURNO_TODOS}>Todos los turnos</option>
            {turnos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Select
            label="División"
            value={division}
            onChange={(event) => setDivision(event.target.value)}
          >
            <option value={DIVISION_TODAS}>Todas las divisiones</option>
            {divisiones.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin cursos"
            desc="No se encontraron cursos que coincidan con los filtros seleccionados."
          />
        ) : (
          <div className="space-y-6">
            {cursosFiltrados.map((curso) => (
              <CursoCard
                key={curso._id || `${curso.anio}-${curso.nombre}`}
                curso={curso}
                resumen={resumenes[curso._id]}
                onImport={importarAlumnos}
                importing={importingFor === curso._id}
              />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function CursoCard({ curso, resumen, onImport, importing }) {
  const personas = [
    ...(Array.isArray(curso.docentes)
      ? curso.docentes.map((persona) => ({ tipo: "docente", persona }))
      : []),
    ...(Array.isArray(curso.alumnos)
      ? curso.alumnos.map((persona) => ({ tipo: "estudiante", persona }))
      : []),
  ];

  const turnoCurso = resolveTurno(curso);
  const divisionCurso = resolveDivision(curso);
  const inputRef = useRef(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await onImport(file, curso._id);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <Card>
      <CardHeader
        title={curso.nombre ? `${curso.nombre}` : `Curso ${curso.anio || ""}`}
        subtitle={`${curso.anio || ""}° · ${divisionCurso}`}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Badge color="neutral" className="w-full sm:w-auto text-center">
              {turnoCurso}
            </Badge>
            <div className="w-full sm:w-auto">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={importing}
                onClick={() => inputRef.current?.click()}
              >
                Importar lista
              </Button>
            </div>
          </div>
        }
      />
      <CardBody className="space-y-4">
        <div className="rounded-2xl border border-dashed border-brand-200/70 bg-brand-50/40 p-4 text-sm text-subtext">
          Cargá un Excel o CSV con columnas como "Nombre" y "Email" para sumar estudiantes al curso.
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-subtext">
          <span className="font-semibold text-text">Docentes:</span>
          {Array.isArray(curso.docentes) && curso.docentes.length > 0 ? (
            curso.docentes.map((docente) => (
              <Badge key={docente._id || docente.email} color="warn">
                {docente.nombre || docente.email}
              </Badge>
            ))
          ) : (
            <Badge color="neutral">Sin docentes asignados</Badge>
          )}
        </div>

        <Table variant="soft">
          <table className="min-w-full text-left">
            <THead>
              <TRow className="bg-transparent">
                <TH>Nombre</TH>
                <TH>Email</TH>
                <TH className="w-32">Rol</TH>
              </TRow>
            </THead>
            <tbody>
              {personas.length === 0 ? (
                <TRow>
                  <TD colSpan={3} className="text-center text-subtext">
                    No hay integrantes asignados.
                  </TD>
                </TRow>
              ) : (
                personas.map(({ persona, tipo }) => (
                  <TRow key={`${curso._id || curso.nombre}-${tipo}-${persona._id || persona.email}`}>
                    <TD>
                      <div className="font-medium text-text">{persona.nombre || "Sin nombre"}</div>
                    </TD>
                    <TD className="text-subtext">{persona.email || "Sin correo"}</TD>
                    <TD>
                      <Badge color={tipo === "docente" ? "warn" : "brand"}>
                        {tipo === "docente" ? "Docente" : "Estudiante"}
                      </Badge>
                    </TD>
                  </TRow>
                ))
              )}
            </tbody>
          </table>
        </Table>

        {resumen ? <ResumenImport resumen={resumen} /> : null}
      </CardBody>
    </Card>
  );
}

function ResumenImport({ resumen }) {
  return (
    <div className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
      <div className="font-semibold">Resultado de la última importación</div>
      <ul className="grid gap-1 sm:grid-cols-2">
        <li>
          <span className="font-semibold">Filas procesadas:</span> {resumen.procesados}
        </li>
        <li>
          <span className="font-semibold">Nuevos usuarios:</span> {resumen.creados}
        </li>
        <li>
          <span className="font-semibold">Actualizados:</span> {resumen.actualizados || 0}
        </li>
        <li>
          <span className="font-semibold">Vinculados al curso:</span> {resumen.vinculados}
        </li>
        <li>
          <span className="font-semibold">Ya asignados:</span> {resumen.yaAsignados || 0}
        </li>
      </ul>
      {Array.isArray(resumen.credencialesNuevas) && resumen.credencialesNuevas.length > 0 ? (
        <details className="rounded-xl border border-brand-200/70 bg-white/70 p-3">
          <summary className="cursor-pointer font-semibold text-brand-700">
            Ver contraseñas temporales generadas
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-subtext">
            {resumen.credencialesNuevas.map((item) => (
              <li key={item.email} className="rounded-lg bg-brand-100/60 px-2 py-1">
                <span className="font-medium text-text">{item.email}</span>: {item.passwordTemporal}
                {item.origen ? (
                  <span className="ml-1 text-[11px] uppercase tracking-wide text-brand-600">
                    ({
                      item.origen === "planilla"
                        ? "planilla"
                        : item.origen === "fortalecida"
                        ? "fortalecida"
                        : item.origen === "documento"
                        ? "desde documento"
                        : item.origen === "email"
                        ? "basada en email"
                        : "generada"
                    })
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {Array.isArray(resumen.omitidos) && resumen.omitidos.length > 0 ? (
        <details className="rounded-xl border border-red-200/80 bg-red-50/80 p-3 text-red-700">
          <summary className="cursor-pointer font-semibold">Filas omitidas ({resumen.omitidos.length})</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {resumen.omitidos.map((item, index) => (
              <li key={`${item.fila || index}-${item.motivo}`}>
                Fila {item.fila ?? index + 1}: {item.motivo}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
