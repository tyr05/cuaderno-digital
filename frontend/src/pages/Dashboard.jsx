// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost } from "../api";
import Shell from "../components/Shell";
import Button from "../components/ui/Button";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { Megaphone, CalendarDays, CheckCircle2, TrendingUp } from "lucide-react";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal "Nuevo anuncio"
  const [openNew, setOpenNew] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [visiblePara, setVisiblePara] = useState("todos");
  const [saving, setSaving] = useState(false);

  const esCreador = user?.rol === "admin" || user?.rol === "docente";

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

  // Cargar anuncios del curso
  useEffect(() => {
    if (!cursoSel) return;
    (async () => {
      try {
        const list = await apiGet(`/api/anuncios?curso=${cursoSel}`);
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnuncios(list);
      } catch { /* toasts por api.js */ }
    })();
  }, [cursoSel]);

  async function crearAnuncio() {
    if (!cursoSel || !titulo.trim() || !contenido.trim()) {
      toast.show("Completá título y contenido", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/anuncios", {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        visiblePara,
        curso: cursoSel,
      });
      setOpenNew(false);
      setTitulo("");
      setContenido("");
      setVisiblePara("todos");

      const list = await apiGet(`/api/anuncios?curso=${cursoSel}`);
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAnuncios(list);

      toast.show("Anuncio publicado");
    } finally {
      setSaving(false);
    }
  }

  const cursoActual = cursos.find((c) => c._id === cursoSel);

  return (
    <Shell
      tabs={[
        { to: "/", label: "Inicio" },
        { to: "/asistencia", label: "Asistencia" },
      ]}
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
          />

          <div className="space-y-6">
            <UpcomingEvents />
            <ProgressHighlights />
          </div>
        </div>
      </section>

      {/* Anuncios */}
      <Card>
        <CardHeader
          title="Anuncios"
          subtitle={cursoSel ? "Del curso seleccionado" : "Seleccioná un curso"}
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
        onClose={() => setOpenNew(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
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
            <Select label="Curso" value={cursoSel} onChange={(e) => setCursoSel(e.target.value)}>
              {cursos.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre} — {c.anio}° {c.division || ""}
                </option>
              ))}
            </Select>

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

function HeroSummary({ user, cursos, cursoSel, onCursoChange, loading, onCreate }) {
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
                <Select
                  value={cursoSel}
                  onChange={(e) => onCursoChange(e.target.value)}
                  className="mt-3 w-full"
                  selectClassName="rounded-xl border border-muted/60 bg-white text-left text-sm text-text shadow-sm"
                >
                  {cursos.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre} — {c.anio}° {c.division || ""}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-subtext/80">Participación</p>
                <p className="mt-2 text-2xl font-semibold text-brand-700">87%</p>
                <p className="text-xs text-subtext">En las últimas 24 h</p>
              </div>
              <div className="rounded-2xl border border-brand-200/60 bg-brand-500/10 p-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700/70">Próxima entrega</p>
                <p className="mt-2 text-lg font-semibold text-brand-700">Viernes 14:00</p>
                <p className="text-xs text-subtext">Recordatorio automático listo</p>
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
          <div className="text-sm text-white/70">
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
          <h3 className="text-lg font-semibold text-title">Próximos eventos</h3>
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
              <div className="font-semibold text-title">{event.title}</div>
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

function ProgressHighlights() {
  const highlights = [
    {
      id: 1,
      label: "Asistencias registradas",
      value: 82,
      icon: CheckCircle2,
      tone: "text-emerald-600",
    },
    {
      id: 2,
      label: "Tareas entregadas",
      value: 64,
      icon: TrendingUp,
      tone: "text-sky-600",
    },
  ];

  return (
    <div className="rounded-3xl border border-muted/60 bg-card/70 p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-title">Avances rápidos</h3>
      <p className="text-sm text-subtext">Seguimiento de indicadores clave de la semana.</p>

      <div className="mt-6 space-y-4">
        {highlights.map(({ id, label, value, icon: Icon, tone }) => (
          <div
            key={id}
            className="rounded-2xl border border-muted/40 bg-white/60 p-4 backdrop-blur transition hover:border-brand/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-subtext">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-title">{value}%</div>
              </div>
              <span className={`rounded-full bg-brand/5 p-2 ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand/50"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
