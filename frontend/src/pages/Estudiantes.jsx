// frontend/src/pages/Estudiantes.jsx
import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import { useAuth } from "../context/AuthProvider";
import { apiGet } from "../api";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Table, THead, TRow, TH, TD } from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

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
      } finally {
        setLoading(false);
      }
    })();
  }, [autorizado]);

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
            {cursosFiltrados.map((curso) => {
              const personas = [
                ...(Array.isArray(curso.docentes)
                  ? curso.docentes.map((persona) => ({
                      tipo: "docente",
                      persona,
                    }))
                  : []),
                ...(Array.isArray(curso.alumnos)
                  ? curso.alumnos.map((persona) => ({
                      tipo: "estudiante",
                      persona,
                    }))
                  : []),
              ];

              const turnoCurso = resolveTurno(curso);
              const divisionCurso = resolveDivision(curso);

              return (
                <Card key={curso._id || `${curso.anio}-${curso.nombre}`}> 
                  <CardHeader
                    title={
                      curso.nombre
                        ? `${curso.nombre}`
                        : `Curso ${curso.anio || ""}`
                    }
                    subtitle={`${curso.anio || ""}° · ${divisionCurso}`}
                    actions={<Badge color="neutral">{turnoCurso}</Badge>}
                  />
                  <CardBody className="space-y-4">
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
                                  <div className="font-medium text-text">
                                    {persona.nombre || "Sin nombre"}
                                  </div>
                                </TD>
                                <TD className="text-subtext">
                                  {persona.email || "Sin correo"}
                                </TD>
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
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </Shell>
  );
}
