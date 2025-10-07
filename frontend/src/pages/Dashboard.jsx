// frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost } from "../api";
import Shell from "../components/Shell";
import Button from "../components/ui/Button";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { Megaphone, CalendarDays, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import Select from "../components/ui/Select";
import DropdownSelect from "../components/ui/DropdownSelect";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [alumnoSel, setAlumnoSel] = useState("todos");

  // Modal "Nuevo anuncio"
  const [openNew, setOpenNew] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [visiblePara, setVisiblePara] = useState("todos");
  const [alcance, setAlcance] = useState("curso");
  const [alumnoDestino, setAlumnoDestino] = useState("");
  const [saving, setSaving] = useState(false);

  const esCreador = user?.rol === "admin" || user?.rol === "docente";
  const tabs = [
    { to: "/", label: "Inicio" },
    { to: "/asistencia", label: "Asistencia" },
  ];
  if (esCreador) {
    tabs.push({ to: "/estudiantes", label: "Estudiantes" });
  }

  // Cargar cursos
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await apiGet("/api/cursos");
        setCursos(list);
        if (list[0]?._id) setCursoSel(list[0]._id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setAlumnoSel("todos");
  }, [cursoSel]);

  // Cargar anuncios del curso
  useEffect(() => {
    if (!cursoSel) {
      setAnuncios([]);
      return;
    }
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("curso", cursoSel);
        if (alumnoSel && alumnoSel !== "todos") {
          params.set("alumno", alumnoSel);
        }
        const list = await apiGet(`/api/anuncios?${params.toString()}`);
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnuncios(list);
      } catch { /* toasts por api.js */ }
    })();
  }, [cursoSel, alumnoSel]);

  // Resumen de asistencia y métricas
  useEffect(() => {
    (async () => {
      setLoadingResumen(true);
      try {
        const params = new URLSearchParams();
        if (cursoSel) params.set("curso", cursoSel);
        params.set("ultimosDias", "7");
        const data = await apiGet(`/api/asistencias/resumen?${params.toString()}`);
        setResumen(data);
      } catch {
        setResumen(null);
      } finally {
        setLoadingResumen(false);
      }
    })();
  }, [cursoSel]);

  async function crearAnuncio() {
    if (!cursoSel || !titulo.trim() || !contenido.trim()) {
      toast.show("Completá título y contenido", "error");
      return;
    }
    if (alcance === "alumno" && !alumnoDestino) {
      toast.show("Elegí un estudiante destinatario", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/anuncios", {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        visiblePara,
        curso: cursoSel,
        alumno: alcance === "alumno" ? alumnoDestino : undefined,
      });
      setOpenNew(false);
      setTitulo("");
      setContenido("");
      setVisiblePara("todos");
      setAlcance("curso");
      setAlumnoDestino("");

      const params = new URLSearchParams();
      params.set("curso", cursoSel);
      if (alumnoSel && alumnoSel !== "todos") {
        params.set("alumno", alumnoSel);
      }
      const list = await apiGet(`/api/anuncios?${params.toString()}`);
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAnuncios(list);

      toast.show("Anuncio publicado");
    } finally {
      setSaving(false);
    }
  }

  const cursoActual = cursos.find((c) => c._id === cursoSel);
  const alumnosCursoActual = useMemo(
    () => (cursoActual?.alumnos ? cursoActual.alumnos : []),
    [cursoActual],
  );

  useEffect(() => {
    if (alcance !== "alumno") return;
    if (!alumnosCursoActual.some((a) => a._id === alumnoDestino)) {
      setAlumnoDestino("");
    }
  }, [alcance, alumnosCursoActual, alumnoDestino]);

  const alumnoActual = useMemo(
    () => alumnosCursoActual.find((a) => a._id === alumnoSel) || null,
    [alumnosCursoActual, alumnoSel],
  );

  return (
    <Shell
      tabs={tabs}
      title="Panel principal"
      description={
        cursoActual
          ? `Curso seleccionado: ${cursoActual.nombre} — ${cursoActual.anio}° ${cursoActual.division || ""}`
          : "Resumen general de novedades y cursos"
      }
      addNewLabel="Nuevo anuncio"
      onAddNew={esCreador ? () => setOpenNew(true) : undefined}
    >
      {/* Resumen superior */}
      <section className="mb-10 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <HeroSummary
            user={user}
            cursos={cursos}
            cursoSel={cursoSel}
            onCursoChange={setCursoSel}
            loading={loading}
            onCreate={esCreador ? () => setOpenNew(true) : undefined}
            resumen={resumen}
            resumenLoading={loadingResumen}
            alumnoSel={alumnoSel}
            onAlumnoChange={setAlumnoSel}
            alumnos={alumnosCursoActual}
            mostrarFiltroAlumnos={esCreador}
          />

          <div className="space-y-6">
            <UpcomingEvents />
            <ProgressHighlights resumen={resumen} loading={loadingResumen} />
          </div>
        </div>
      </section>

      {/* Anuncios */}
      <Card>
        <CardHeader
          title="Anuncios"
          subtitle={
            cursoSel
              ? alumnoSel === "todos"
                ? "Del curso seleccionado"
                : `Personalizados para ${alumnoActual?.nombre || "el estudiante"}`
              : "Seleccioná un curso"
          }
        />
        <CardBody>
          {anuncios.length === 0 ? (
            <EmptyState title="Sin anuncios" desc="Cuando haya novedades, aparecerán aquí." />
          ) : (
            <ul className="space-y-3">
              {anuncios.map((a) => (
                <li key={a._id} className="p-4 rounded-2xl border border-muted bg-surface hover:bg-card transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-subtext">
                      <Megaphone className="h-4 w-4" aria-hidden="true" />
                      <span>{a.curso?.nombre}</span>
                      <span>•</span>
                      <span>{new Date(a.createdAt).toLocaleString("es-AR")}</span>
                    </div>
                    <Badge color="brand">{a.autor?.rol}</Badge>
                  </div>
                  <div className="mt-1 text-lg font-semibold">{a.titulo}</div>
                  <div className="text-sm text-text/90 whitespace-pre-line">{a.contenido}</div>
                  {a.alumno ? (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700">
                      🎯 Dirigido a {a.alumno.nombre}
                    </div>
                  ) : null}
                  <div className="text-xs text-subtext mt-1">
                    Autor: {a.autor?.nombre}
                    {a.visiblePara && a.visiblePara !== "todos" ? ` — visible para ${a.visiblePara}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Modal Nuevo anuncio */}
      <Modal
        open={openNew}
        title="Publicar anuncio"
        onClose={() => {
          setOpenNew(false);
          setTitulo("");
          setContenido("");
          setVisiblePara("todos");
          setAlcance("curso");
          setAlumnoDestino("");
        }}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenNew(false);
                setTitulo("");
                setContenido("");
                setVisiblePara("todos");
                setAlcance("curso");
                setAlumnoDestino("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={crearAnuncio} disabled={saving}>
              {saving ? "Publicando…" : "Publicar"}
            </Button>
          </>
        }
      >
        {cursos.length === 0 ? (
          <div className="text-subtext">No hay cursos disponibles.</div>
        ) : (
          <div className="space-y-3">
            <DropdownSelect
              label="Curso"
              value={cursoSel}
              onChange={(next) => setCursoSel(next)}
              options={cursos.map((c) => ({
                value: c._id,
                title: c.nombre,
                subtitle: `${c.anio}° ${c.division || ""}${c.turno ? ` · Turno ${c.turno}` : ""}`,
              }))}
              placeholder="Elegí un curso"
            />

            <Input
              label="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Acto 9 de Julio"
            />

            <label className="block">
              <div className="text-sm text-subtext mb-1">Contenido</div>
              <textarea
                className="w-full min-h-[120px]"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Detalles del anuncio…"
              />
            </label>

            <div className="rounded-2xl border border-muted/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext/80">Alcance</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {["curso", "alumno"].map((key) => {
                  const active = alcance === key;
                  const labels = {
                    curso: {
                      title: "Curso completo",
                      desc: "Lo verán todos en el curso seleccionado",
                    },
                    alumno: {
                      title: "Estudiante",
                      desc: "Mensaje personalizado para un alumno",
                    },
                  };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAlcance(key)}
                      className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-400/40 ${
                        active
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-transparent bg-white text-text hover:border-brand-100"
                      }`}
                    >
                      <p className="text-sm font-semibold">{labels[key].title}</p>
                      <p className="text-xs text-subtext">{labels[key].desc}</p>
                    </button>
                  );
                })}
              </div>

              {alcance === "alumno" && (
                <DropdownSelect
                  className="mt-3"
                  label="Estudiante destinatario"
                  value={alumnoDestino}
                  onChange={(next) => setAlumnoDestino(next)}
                  options={alumnosCursoActual.map((a) => ({
                    value: a._id,
                    title: a.nombre,
                    subtitle: a.email || "Sin correo registrado",
                  }))}
                  placeholder={
                    alumnosCursoActual.length === 0
                      ? "Este curso no tiene estudiantes"
                      : "Elegí un estudiante"
                  }
                  disabled={alumnosCursoActual.length === 0}
                  helper={
                    alumnosCursoActual.length === 0
                      ? "Agregá estudiantes al curso para enviar anuncios personalizados"
                      : ""
                  }
                />
              )}
            </div>

            <Select label="Visible para" value={visiblePara} onChange={(e) => setVisiblePara(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="padres">Familias</option>
              <option value="estudiantes">Estudiantes</option>
              <option value="docentes">Docentes</option>
            </Select>
          </div>
        )}
      </Modal>
    </Shell>
  );
}

function HeroSummary({
  user,
  cursos,
  cursoSel,
  onCursoChange,
  loading,
  onCreate,
  resumen,
  resumenLoading,
  alumnoSel,
  onAlumnoChange,
  alumnos,
  mostrarFiltroAlumnos = false,
}) {
  const presentes = resumen?.estados?.presente;
  const tarde = resumen?.llegadasTarde;
  const cursoOptions = useMemo(
    () =>
      cursos.map((c) => ({
        value: c._id,
        title: c.nombre,
        subtitle: `${c.anio}° ${c.division || ""}${c.turno ? ` · Turno ${c.turno}` : ""}`,
      })),
    [cursos],
  );
  const alumnoOptions = useMemo(() => {
    const base = [
      {
        value: "todos",
        title: "Todos los estudiantes",
        subtitle: "Ver anuncios generales y personalizados",
      },
    ];
    if (!Array.isArray(alumnos)) return base;
    return base.concat(
      alumnos.map((a) => ({
        value: a._id,
        title: a.nombre,
        subtitle: a.email || "Sin correo registrado",
      })),
    );
  }, [alumnos]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-muted/50 bg-gradient-to-br from-brand-100 via-brand-50 to-white p-8 text-text shadow-soft">
      <div className="relative z-10 flex flex-col gap-8 lg:gap-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700/70">Panel principal</p>
            <h2 className="mt-3 text-3xl font-semibold leading-snug text-text sm:text-4xl">
              ¡Hola{user?.nombre ? `, ${user.nombre}` : ""}! Organizá tu jornada
            </h2>
            <p className="mt-4 text-base text-subtext">
              Revisá anuncios, seguí el pulso de los cursos y mantené informada a la comunidad educativa desde un solo lugar.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-4 lg:items-end">
            <div className="w-full rounded-2xl border border-brand-200/60 bg-white/80 p-4 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-subtext/80">Curso activo</div>
              {loading ? (
                <div className="mt-3 text-sm text-subtext">Cargando cursos…</div>
              ) : cursos.length === 0 ? (
                <div className="mt-3 text-sm text-subtext">No hay cursos disponibles.</div>
              ) : (
                <DropdownSelect
                  className="mt-3"
                  value={cursoSel}
                  onChange={(next) => onCursoChange(next)}
                  options={cursoOptions}
                  placeholder="Elegí un curso"
                  buttonClassName="border border-muted/60 bg-white text-left text-sm text-text shadow-sm"
                />
              )}
              {mostrarFiltroAlumnos ? (
                <DropdownSelect
                  className="mt-4"
                  label="Filtrar anuncios"
                  value={cursoSel ? alumnoSel : "todos"}
                  onChange={(next) => onAlumnoChange(next)}
                  options={alumnoOptions}
                  placeholder="Todos los estudiantes"
                  disabled={!cursoSel}
                  helper={
                    !cursoSel
                      ? "Seleccioná un curso para elegir estudiantes"
                      : alumnoSel !== "todos"
                        ? "Mostrando anuncios generales y personalizados"
                        : undefined
                  }
                />
              ) : null}
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-subtext/80">Participación</p>
                {resumenLoading ? (
                  <Skeleton className="mt-2 h-7 w-20 rounded-xl" />
                ) : presentes ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-brand-700">{presentes.porcentaje}%</p>
                    <p className="text-xs text-subtext">
                      {presentes.total} registros positivos en 7 días
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-subtext">Sin datos disponibles</p>
                )}
              </div>
              <div className="rounded-2xl border border-brand-200/60 bg-brand-500/10 p-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700/70">Llegadas tarde</p>
                {resumenLoading ? (
                  <Skeleton className="mt-2 h-6 w-16 rounded-xl" />
                ) : tarde ? (
                  <>
                    <p className="mt-2 text-lg font-semibold text-brand-700">{tarde.total}</p>
                    <p className="text-xs text-subtext">{tarde.porcentaje}% del período</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-subtext">Aún sin registros</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {onCreate ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onCreate} className="shadow-soft">
              Publicar anuncio
            </Button>
            <div className="text-sm text-subtext">
              Compartí novedades con estudiantes, familias y docentes en segundos.
            </div>
          </div>
        ) : (
          <div className="text-sm text-subtext">
            Los anuncios nuevos aparecerán aquí cuando tus docentes los publiquen.
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingEvents() {
  const events = [
    {
      id: 1,
      title: "Reunión de familias",
      description: "3° ciclo — Aula magna",
      date: "12 Jun",
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      id: 2,
      title: "Entrega de boletines",
      description: "Turno mañana",
      date: "22 Jun",
      tone: "text-sky-600 bg-sky-50",
    },
    {
      id: 3,
      title: "Acto Día de la Bandera",
      description: "Organiza 4° año",
      date: "20 Jun",
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="rounded-3xl border border-muted/60 bg-card/70 p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-brand/10 p-2 text-brand">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-text">Próximos eventos</h3>
          <p className="text-sm text-subtext">Agenda destacada para los próximos días.</p>
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded-2xl border border-muted/50 bg-white/50 px-4 py-3 text-sm text-subtext backdrop-blur"
          >
            <div>
              <div className="font-semibold text-text">{event.title}</div>
              <div>{event.description}</div>
            </div>
            <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${event.tone}`}>
              {event.date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressHighlights({ resumen, loading }) {
  const items = resumen
    ? [
        {
          id: "presentes",
          label: "Asistencias registradas",
          value: resumen.estados?.presente?.porcentaje ?? 0,
          helper: `${resumen.estados?.presente?.total || 0} presentes`,
          icon: CheckCircle2,
          tone: "text-emerald-600",
          bar: "from-emerald-500 to-emerald-300",
        },
        {
          id: "ausentes",
          label: "Ausencias detectadas",
          value: resumen.estados?.ausente?.porcentaje ?? 0,
          helper: `${resumen.estados?.ausente?.total || 0} registros`,
          icon: AlertCircle,
          tone: "text-rose-600",
          bar: "from-rose-500 to-rose-300",
        },
        {
          id: "tarde",
          label: "Llegadas tarde",
          value: resumen.estados?.tarde?.porcentaje ?? 0,
          helper: `${resumen.estados?.tarde?.total || 0} ingresos demorados`,
          icon: TrendingUp,
          tone: "text-amber-600",
          bar: "from-amber-500 to-amber-300",
        },
        {
          id: "justificados",
          label: "Justificaciones pendientes",
          value: resumen.justificacionesPendientes || 0,
          helper: "En espera de aprobación",
          icon: Megaphone,
          tone: "text-sky-600",
          bar: "from-sky-500 to-sky-300",
          isAbsolute: true,
        },
      ]
    : [];

  return (
    <div className="rounded-3xl border border-muted/60 bg-card/70 p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-text">Avances rápidos</h3>
      <p className="text-sm text-subtext">Seguimiento de indicadores clave de la semana.</p>

      <div className="mt-6 space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </>
        ) : items.length === 0 ? (
          <EmptyState title="Sin datos" desc="No se registraron asistencias en el período." />
        ) : (
          items.map((item) => {
            const { id, label, value, helper, icon: Icon, tone, bar, isAbsolute } = item;
            return (
              <div
                key={id}
                className="rounded-2xl border border-muted/40 bg-white/60 p-4 backdrop-blur transition hover:border-brand/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-subtext">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-text">
                      {isAbsolute ? value : `${value}%`}
                    </div>
                    <p className="text-xs text-subtext">{helper}</p>
                  </div>
                  <span className={`rounded-full bg-brand/5 p-2 ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                {!isAbsolute && (
                  <div className="mt-3 h-2 rounded-full bg-muted/40">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${bar}`}
                      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
