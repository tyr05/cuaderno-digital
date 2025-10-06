// frontend/src/pages/Asistencia.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost, apiPostForm } from "../api";
import Shell from "../components/Shell";
import Button from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Table, THead, TRow, TH, TD } from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const formatCursoEtiqueta = (curso) => {
  if (!curso) return "";
  const partes = [`${curso.anio}°`, curso.division, curso.turno].filter(Boolean);
  return partes.join(" ");
};

function hoyStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Asistencia() {
  const { user } = useAuth();
  const toast = useToast();

  const [cursos, setCursos] = useState([]);
  const [cursosLoading, setCursosLoading] = useState(false);
  const [cursoSel, setCursoSel] = useState("");
  const [fecha, setFecha] = useState(hoyStr());
  const [alumnos, setAlumnos] = useState([]);   // alumnos del curso (docente/admin)
  const [registros, setRegistros] = useState([]); // asistencias del día
  const [cargando, setCargando] = useState(false);

  // Estado UI — modales
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyFor, setJustifyFor] = useState(null);
  const [justifyFile, setJustifyFile] = useState(null);
  const [justifyMotivo, setJustifyMotivo] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFor, setConfirmFor] = useState(null);

  const esDocenteOAdmin = user?.rol === "docente" || user?.rol === "admin";
  const esPadre = user?.rol === "padre";
  const esEstudiante = user?.rol === "estudiante";

  // Cargar cursos para docente/admin
  useEffect(() => {
    if (!esDocenteOAdmin) return;
    (async () => {
      setCursosLoading(true);
      try {
        const list = await apiGet("/api/cursos");
        setCursos(list);
        if (list[0]?._id) setCursoSel(list[0]._id);
      } finally {
        setCursosLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDocenteOAdmin]);

  // Cargar alumnos del curso seleccionado
  useEffect(() => {
    if (!esDocenteOAdmin || !cursoSel) return;
    const curso = cursos.find((c) => c._id === cursoSel);
    setAlumnos(curso?.alumnos || []);
  }, [cursoSel, cursos, esDocenteOAdmin]);

  // Cargar asistencias según rol/fecha/curso
  useEffect(() => {
    (async () => {
      try {
        if (esDocenteOAdmin && cursoSel) {
          const data = await apiGet(`/api/asistencias?curso=${cursoSel}&fecha=${fecha}`);
          setRegistros(data);
        } else if (esPadre) {
          const data = await apiGet(`/api/asistencias?fecha=${fecha}`);
          setRegistros(data);
        } else if (esEstudiante) {
          const data = await apiGet(`/api/asistencias?fecha=${fecha}&alumno=${user.id}`);
          setRegistros(data);
        }
      } catch (e) {
        // manejado por api.js con toast de error
      }
    })();
  }, [fecha, cursoSel, esDocenteOAdmin, esPadre, esEstudiante, user?.id]);

  // Mapa alumnoId -> estado (para precargar selects)
  const estadoMap = useMemo(() => {
    const m = new Map();
    for (const r of registros) m.set(r.alumno?._id || r.alumno, r.estado);
    return m;
  }, [registros]);

  // ---- Acciones ----
  async function guardarMarcas() {
    if (!esDocenteOAdmin || !cursoSel) return;
    setCargando(true);
    try {
      const lista = alumnos.map((a) => {
        const sel = document.getElementById(`estado-${a._id}`);
        return { alumnoId: a._id, estado: sel?.value || "presente" };
      });
      await apiPost("/api/asistencias/marcar", { cursoId: cursoSel, fecha, lista });
      const data = await apiGet(`/api/asistencias?curso=${cursoSel}&fecha=${fecha}`);
      setRegistros(data);
      toast.show("Asistencia guardada");
    } finally {
      setCargando(false);
    }
  }

  // Justificar (Padre) — abrir y enviar
  function abrirJustificar(asistenciaId) {
    setJustifyFor(asistenciaId);
    setJustifyFile(null);
    setJustifyMotivo("");
    setJustifyOpen(true);
  }
  async function enviarJustificacion() {
    if (!justifyFor || !justifyFile) return;
    const fd = new FormData();
    fd.append("certificado", justifyFile);
    fd.append("motivo", justifyMotivo || "");
    await apiPostForm(`/api/asistencias/${justifyFor}/justificar`, fd);
    setJustifyOpen(false);
    toast.show("Justificación enviada");
    const data = await apiGet(`/api/asistencias?fecha=${fecha}`);
    setRegistros(data);
  }

  // Aprobar (Docente/Admin) — abrir y confirmar
  function abrirAprobar(asistenciaId) {
    setConfirmFor(asistenciaId);
    setConfirmOpen(true);
  }
  async function aprobarConfirmado() {
    await apiPost(`/api/asistencias/${confirmFor}/aprobar`, {});
    setConfirmOpen(false);
    toast.show("Justificación aprobada");
    const data = await apiGet(`/api/asistencias?curso=${cursoSel}&fecha=${fecha}`);
    setRegistros(data);
  }

  // Render de filas
  const filas = esDocenteOAdmin ? alumnos : registros.map((r) => r.alumno);

  const totalAlumnosVista = esDocenteOAdmin ? alumnos.length : registros.length;

  const resumenEstados = useMemo(() => {
    const counts = {
      presente: 0,
      ausente: 0,
      tarde: 0,
      justificado: 0,
    };

    registros.forEach((registro) => {
      if (!registro?.estado) return;
      const key = registro.estado;
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }, [registros]);

  const summaryData = useMemo(() => {
    const base = [
      { key: "presente", label: "Presentes", color: "success", icon: "✅" },
      { key: "ausente", label: "Ausentes", color: "danger", icon: "🚫" },
      { key: "tarde", label: "Llegadas tarde", color: "warn", icon: "⏰" },
      { key: "justificado", label: "Justificados", color: "brand", icon: "📝" },
    ];

    return base.map((item) => {
      const value = resumenEstados[item.key] || 0;
      const total = totalAlumnosVista || 0;
      const ratio = total ? Math.round((value / total) * 100) : null;

      return {
        ...item,
        value,
        helper: ratio !== null
          ? `${ratio}% del grupo (${value}/${total})`
          : "Aún sin datos para hoy",
      };
    });
  }, [resumenEstados, totalAlumnosVista]);

  const fechaLegible = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(fecha));
    } catch (error) {
      return fecha;
    }
  }, [fecha]);

  const estadoColorMap = {
    presente: "success",
    ausente: "danger",
    tarde: "warn",
    justificado: "brand",
  };

  return (
    <Shell
      tabs={[
        { to: "/", label: "Inicio" },
        { to: "/asistencia", label: "Asistencia" },
      ]}
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryData.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-soft backdrop-blur-sm"
            >
              <div>
                <Badge color={item.color}>{item.label}</Badge>
                <p className="mt-3 text-3xl font-semibold text-text">{item.value}</p>
                <p className="mt-1 text-xs text-subtext">{item.helper}</p>
              </div>
              <span aria-hidden className="text-3xl">
                {item.icon}
              </span>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="space-y-4">
            <Card className="border-white/60 bg-white/90">
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 text-xl">
                    📅
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-subtext/80">Filtro</p>
                    <p className="text-base font-semibold text-text">Fecha</p>
                  </div>
                </div>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </CardBody>
            </Card>

            <Card className="border-white/60 bg-white/90">
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 text-xl">
                    🎓
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-subtext/80">Filtro</p>
                    <p className="text-base font-semibold text-text">Curso</p>
                  </div>
                </div>

                {esDocenteOAdmin ? (
                  cursosLoading ? (
                    <Skeleton className="h-11 w-full rounded-2xl" />
                  ) : (
                    <Select value={cursoSel} onChange={(e) => setCursoSel(e.target.value)}>
                      {cursos.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.nombre} — {formatCursoEtiqueta(c)}
                        </option>
                      ))}
                    </Select>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-500/5 p-4 text-sm text-subtext">
                    Padres y estudiantes ven solo su registro diario.
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="border-white/60 bg-white/90">
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 text-xl">
                    💾
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-subtext/80">Acción</p>
                    <p className="text-base font-semibold text-text">Guardar cambios</p>
                  </div>
                </div>

                {esDocenteOAdmin ? (
                  <Button
                    variant="primary"
                    onClick={guardarMarcas}
                    loading={cargando}
                    className="w-full"
                  >
                    {cargando ? "Guardando..." : "Guardar asistencia"}
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-white/60 bg-muted/60 p-4 text-sm text-subtext">
                    Gestioná justificaciones desde la tabla principal.
                  </div>
                )}
              </CardBody>
            </Card>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl border border-white/60 bg-[linear-gradient(135deg,rgba(224,242,254,0.85),rgba(209,250,229,0.9))] p-6 text-text shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-subtext/80">Registros del día</p>
                  <h2 className="text-2xl font-semibold">Listado de asistencia</h2>
                </div>
                <Badge color="neutral">{fechaLegible}</Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm text-subtext">
                {esDocenteOAdmin
                  ? "Actualizá los estados y guardá para sincronizar con las familias."
                  : "Revisá tu asistencia y justificá cualquier ausencia desde los accesos rápidos."}
              </p>
            </div>

            <Table variant="soft" className="bg-white/80">
              <table className="min-w-full text-left text-sm">
                <THead>
                  <tr>
                    <TH>Alumno</TH>
                    <TH className="w-40">Estado</TH>
                    <TH>Justificación</TH>
                    <TH className="w-44">Acciones</TH>
                  </tr>
                </THead>
                <tbody>
                  {filas.map((a, idx) => {
                    const reg = esDocenteOAdmin
                      ? registros.find((r) => (r.alumno?._id || r.alumno) === a._id)
                      : registros[idx];

                    const estado = esDocenteOAdmin
                      ? estadoMap.get(a._id) || "presente"
                      : reg?.estado;

                    const asistenciaId = reg?._id;
                    const justi = reg?.justificacion;

                    const estadoLabel = estado
                      ? estado.charAt(0).toUpperCase() + estado.slice(1)
                      : "Sin estado";

                    return (
                      <TRow
                        key={(a && (a._id || a.id)) || idx}
                        className={idx % 2 === 0 ? "bg-white/70" : "bg-white/50"}
                      >
                        <TD className="font-medium text-text">{a?.nombre || "—"}</TD>

                        <TD>
                          {esDocenteOAdmin ? (
                            <select
                              id={`estado-${a._id}`}
                              defaultValue={estado}
                              className="w-full rounded-2xl border border-white/70 bg-white px-3 py-2 text-sm text-text shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-300"
                            >
                              <option value="presente">Presente</option>
                              <option value="ausente">Ausente</option>
                              <option value="tarde">Tarde</option>
                              <option value="justificado" disabled>
                                Justificado (al aprobar)
                              </option>
                            </select>
                          ) : (
                            <Badge color={estadoColorMap[estado] || "neutral"}>{estadoLabel}</Badge>
                          )}
                        </TD>

                        <TD>
                          {justi?.archivoUrl ? (
                            <div className="space-y-1">
                              <a
                                href={`${BASE}${justi.archivoUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 underline-offset-2 hover:underline"
                              >
                                Ver comprobante
                              </a>
                              <Badge color={justi.aprobado ? "success" : "warn"}>
                                {justi.aprobado ? "Aprobado" : "Pendiente"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-subtext">Sin adjuntos</span>
                          )}
                        </TD>

                        <TD>
                          <div className="flex flex-wrap gap-2">
                            {esPadre && reg && estado === "ausente" && !justi?.archivoUrl && (
                              <Button variant="soft" onClick={() => abrirJustificar(asistenciaId)}>
                                Justificar
                              </Button>
                            )}
                            {esDocenteOAdmin && reg && justi?.archivoUrl && !justi.aprobado && (
                              <Button variant="success" onClick={() => abrirAprobar(asistenciaId)}>
                                Aprobar
                              </Button>
                            )}
                          </div>
                        </TD>
                      </TRow>
                    );
                  })}
                  {filas.length === 0 && (
                    <TRow className="bg-white/70">
                      <TD colSpan={4} className="py-12 text-center text-subtext">
                        {esDocenteOAdmin
                          ? "Sin estudiantes cargados para este curso."
                          : "Aún sin registros de asistencia para hoy."}
                      </TD>
                    </TRow>
                  )}
                </tbody>
              </table>
            </Table>

            {!esDocenteOAdmin && registros.length === 0 && (
              <EmptyState
                title="Sin registros"
                desc="No hay asistencias para la fecha seleccionada."
              />
            )}
          </section>
        </div>
      </div>

      {/* --- Modales --- */}
      <Modal
        open={justifyOpen}
        title="Justificar ausencia"
        onClose={() => setJustifyOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setJustifyOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={enviarJustificacion}
              disabled={!justifyFile}
            >
              Enviar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Motivo (opcional)"
            placeholder="Ej: turnero médico"
            value={justifyMotivo}
            onChange={(e)=>setJustifyMotivo(e.target.value)}
          />
          <label className="block">
            <div className="text-sm text-subtext mb-1">Certificado (PDF/JPG/PNG)</div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full"
              onChange={(e) => setJustifyFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        title="Aprobar justificación"
        onClose={() => setConfirmOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={aprobarConfirmado}>
              Aprobar
            </Button>
          </>
        }
      >
        <div className="text-subtext">
          ¿Confirmás aprobar la justificación? El estado pasará a <b>justificado</b>.
        </div>
      </Modal>
    </Shell>
  );
}
