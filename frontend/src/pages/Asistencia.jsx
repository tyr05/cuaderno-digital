// frontend/src/pages/Asistencia.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost, apiPostForm } from "../api";
import Shell from "../components/Shell";
import Button from "../components/ui/Button";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Table, THead, TRow, TH, TD } from "../components/ui/Table";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

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
  const [estadoSeleccionado, setEstadoSeleccionado] = useState({});
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
  const estadoDesdeRegistros = useMemo(() => {
    const map = {};
    for (const r of registros) {
      const id = r.alumno?._id || r.alumno;
      if (!id) continue;
      map[id] = r.estado;
    }
    return map;
  }, [registros]);

  useEffect(() => {
    if (!esDocenteOAdmin) {
      setEstadoSeleccionado(estadoDesdeRegistros);
      return;
    }

    const nextEstados = alumnos.reduce((acc, alumno) => {
      if (!alumno?._id) return acc;
      acc[alumno._id] = estadoDesdeRegistros[alumno._id] ?? "presente";
      return acc;
    }, {});

    setEstadoSeleccionado(nextEstados);
  }, [alumnos, estadoDesdeRegistros, esDocenteOAdmin]);

  // ---- Acciones ----
  async function guardarMarcas() {
    if (!esDocenteOAdmin || !cursoSel) return;
    setCargando(true);
    try {
      const lista = alumnos.map((a) => ({
        alumnoId: a._id,
        estado: estadoSeleccionado[a._id] ?? "presente",
      }));
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

  return (
    <Shell
      tabs={[
        { to: "/", label: "Inicio" },
        { to: "/asistencia", label: "Asistencia" },
      ]}
    >
      {/* Filtros */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader title="Fecha" subtitle="Seleccioná el día" />
          <CardBody>
            <Input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Curso"
            subtitle={esDocenteOAdmin ? "Solo para docente/admin" : "Tu rol filtra tu vista"}
          />
          <CardBody>
            {esDocenteOAdmin ? (
              cursosLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={cursoSel} onChange={(e)=>setCursoSel(e.target.value)}>
                  {cursos.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre} — {c.anio}° {c.division || ""}
                    </option>
                  ))}
                </Select>
              )
            ) : (
              <div className="text-subtext text-sm">
                Padres/estudiantes ven solo sus registros del día.
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Acciones" />
          <CardBody className="flex items-center gap-3">
            {esDocenteOAdmin ? (
              <Button onClick={guardarMarcas} disabled={cargando}>
                {cargando ? "Guardando..." : "Guardar asistencia"}
              </Button>
            ) : (
              <div className="text-subtext text-sm">
                Justificá ausencias desde la tabla.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader title="Registros de asistencia" subtitle={fecha} />
        <CardBody>
          <Table>
            <table className="w-full text-left">
              <THead>
                <tr>
                  <TH>Alumno</TH>
                  <TH>Estado</TH>
                  <TH>Justificación</TH>
                  <TH>Acciones</TH>
                </tr>
              </THead>
              <tbody>
                {filas.map((a, idx) => {
                  const reg = esDocenteOAdmin
                    ? registros.find((r) => (r.alumno?._id || r.alumno) === a._id)
                    : registros[idx];

                  const estado = esDocenteOAdmin
                    ? estadoSeleccionado[a._id] ?? "presente"
                    : reg?.estado;

                  const asistenciaId = reg?._id;
                  const justi = reg?.justificacion;

                  return (
                    <TRow key={(a && (a._id || a.id)) || idx}>
                      <TD>{a?.nombre || "—"}</TD>

                      <TD>
                        {esDocenteOAdmin ? (
                          <select
                            value={estadoSeleccionado[a._id] ?? "presente"}
                            onChange={(e) =>
                              setEstadoSeleccionado((prev) => ({
                                ...prev,
                                [a._id]: e.target.value,
                              }))
                            }
                            className="p-1"
                          >
                            <option value="presente">Presente</option>
                            <option value="ausente">Ausente</option>
                            <option value="tarde">Tarde</option>
                            <option value="justificado" disabled>Justificado (al aprobar)</option>
                          </select>
                        ) : (
                          <Badge color={
                            estado === "presente" ? "success" :
                            estado === "tarde" ? "warn" :
                            estado === "justificado" ? "brand" : "danger"
                          }>
                            {estado}
                          </Badge>
                        )}
                      </TD>

                      <TD>
                        {justi?.archivoUrl ? (
                          <div className="text-sm">
                            <a
                              href={`${BASE}${justi.archivoUrl}`}
                              target="_blank"
                              className="underline"
                            >
                              Ver archivo
                            </a>
                            <div className="text-xs text-subtext">
                              {justi.aprobado ? "Aprobado" : "Pendiente"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-subtext text-sm">—</span>
                        )}
                      </TD>

                      <TD className="space-x-2">
                        {esPadre && reg && estado === "ausente" && !justi?.archivoUrl && (
                          <Button onClick={() => abrirJustificar(asistenciaId)}>
                            Justificar
                          </Button>
                        )}
                        {esDocenteOAdmin && reg && justi?.archivoUrl && !justi.aprobado && (
                          <Button onClick={() => abrirAprobar(asistenciaId)}>
                            Aprobar
                          </Button>
                        )}
                      </TD>
                    </TRow>
                  );
                })}
              </tbody>
            </table>
          </Table>

          {!esDocenteOAdmin && registros.length === 0 && (
            <EmptyState title="Sin registros" desc="No hay asistencias para la fecha seleccionada." />
          )}
        </CardBody>
      </Card>

      {/* --- Modales --- */}
      <Modal
        open={justifyOpen}
        title="Justificar ausencia"
        onClose={() => setJustifyOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setJustifyOpen(false)}>Cancelar</Button>
            <Button onClick={enviarJustificacion} disabled={!justifyFile}>Enviar</Button>
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
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={aprobarConfirmado}>Aprobar</Button>
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
