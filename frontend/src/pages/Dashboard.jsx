// frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Megaphone, Plus } from "lucide-react";

import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost } from "../api";
import Shell from "../components/Shell";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import RecentTile from "../components/dashboard/RecentTile";
import AnnouncementCard from "../components/dashboard/AnnouncementCard";

const tonePalette = ["sky", "rose", "amber", "teal"];

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [cursos, setCursos] = useState([]);
  const [cursoSel, setCursoSel] = useState("");
  const [anuncios, setAnuncios] = useState([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingAnuncios, setLoadingAnuncios] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [visiblePara, setVisiblePara] = useState("todos");
  const [saving, setSaving] = useState(false);

  const esCreador = user?.rol === "admin" || user?.rol === "docente";

  useEffect(() => {
    (async () => {
      setLoadingCursos(true);
      try {
        const list = await apiGet("/api/cursos");
        setCursos(list);
        if (list[0]?._id) {
          setCursoSel((prev) => prev || list[0]._id);
        }
      } finally {
        setLoadingCursos(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cursoSel) {
      setAnuncios([]);
      setLoadingAnuncios(false);
      return;
    }
    (async () => {
      setLoadingAnuncios(true);
      try {
        const list = await apiGet(`/api/anuncios?curso=${cursoSel}`);
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnuncios(list);
      } catch {
        setAnuncios([]);
      } finally {
        setLoadingAnuncios(false);
      }
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

  const cursoActual = useMemo(
    () => cursos.find((curso) => curso._id === cursoSel),
    [cursos, cursoSel],
  );

  return (
    <Shell
      tabs={[
        { to: "/", label: "Inicio" },
        { to: "/asistencia", label: "Asistencia" },
      ]}
    >
      <div className="space-y-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-text">¡Hola {user?.nombre || ""}!</h1>
            <p className="text-sm text-subtext">
              Revisá las novedades de tus cursos y organizá tus comunicaciones desde un mismo lugar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {esCreador ? (
              <Button onClick={() => setOpenNew(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nuevo anuncio
              </Button>
            ) : null}
            <div className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs text-subtext/80">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Próximamente: agenda escolar integrada
            </div>
          </div>
        </header>

        <section aria-labelledby="recent-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="recent-section" className="text-lg font-semibold text-text">
                Elementos recientes
              </h2>
              <p className="text-sm text-subtext">
                Elegí un curso para ver sus anuncios destacados.
              </p>
            </div>
            {cursoActual ? (
              <span className="hidden rounded-full bg-surface px-3 py-1 text-xs text-subtext/80 sm:inline-flex">
                Última actualización: {new Date(cursoActual.updatedAt || cursoActual.createdAt || Date.now()).toLocaleDateString("es-AR")}
              </span>
            ) : null}
          </div>

          {loadingCursos ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <RecentTile key={index} loading />
              ))}
            </div>
          ) : cursos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/40 bg-surface/60 px-6 py-12 text-center text-subtext/80">
              <BookOpen className="mb-4 h-10 w-10 text-subtext/50" aria-hidden="true" />
              <p className="text-base font-medium text-text">Sin cursos todavía</p>
              <p className="mt-1 text-sm text-subtext">
                Cuando la institución te asigne cursos, aparecerán aquí con sus colores pastel.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cursos.map((curso, index) => {
                const tone = tonePalette[index % tonePalette.length];
                const subtitle = `${curso.anio}° ${curso.division || ""}`.trim();
                return (
                  <RecentTile
                    key={curso._id}
                    icon={BookOpen}
                    title={curso.nombre}
                    subtitle={subtitle}
                    tone={tone}
                    active={cursoSel === curso._id}
                    onClick={() => setCursoSel(curso._id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="announcements-section" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="announcements-section" className="text-lg font-semibold text-text">
                Mis anuncios
              </h2>
              <p className="text-sm text-subtext">
                Vista tipo parrilla para revisar tus notas y comunicados del curso seleccionado.
              </p>
            </div>
            {cursoActual ? (
              <div className="flex items-center gap-2 text-xs text-subtext/70">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                {cursoActual.nombre}
              </div>
            ) : null}
          </div>

          {loadingAnuncios ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <AnnouncementCard key={index} loading />
              ))}
            </div>
          ) : anuncios.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted/40 bg-gradient-to-br from-surface to-white px-6 py-16 text-center">
              <Megaphone className="mx-auto mb-4 h-12 w-12 text-subtext/40" aria-hidden="true" />
              <h3 className="text-base font-semibold text-text">Aún no hay anuncios para este curso</h3>
              <p className="mt-2 text-sm text-subtext">
                Publicá tu primer anuncio para mantener informadas a las familias y estudiantes.
              </p>
              {esCreador ? (
                <Button className="mt-6" variant="subtle" onClick={() => setOpenNew(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Crear anuncio
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {anuncios.map((a, index) => {
                const tone = tonePalette[index % tonePalette.length];
                const fecha = new Date(a.createdAt).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                });
                const audienceLabel =
                  !a.visiblePara || a.visiblePara === "todos"
                    ? "Todos"
                    : a.visiblePara.charAt(0).toUpperCase() + a.visiblePara.slice(1);
                return (
                  <AnnouncementCard
                    key={a._id}
                    title={a.titulo}
                    summary={a.contenido}
                    date={fecha}
                    author={a.autor?.nombre}
                    audience={audienceLabel}
                    course={a.curso?.nombre}
                    tone={tone}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={openNew}
        title="Publicar anuncio"
        onClose={() => setOpenNew(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button onClick={crearAnuncio} disabled={saving}>
              {saving ? "Publicando…" : "Publicar"}
            </Button>
          </>
        }
      >
        {cursos.length === 0 ? (
          <EmptyState
            title="Sin cursos disponibles"
            desc="Para publicar anuncios necesitás tener cursos asignados."
          />
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
                className="w-full min-h-[120px] rounded-xl border border-muted bg-surface px-3 py-2"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Detalles del anuncio…"
              />
            </label>

            <Select
              label="Visible para"
              value={visiblePara}
              onChange={(e) => setVisiblePara(e.target.value)}
            >
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
