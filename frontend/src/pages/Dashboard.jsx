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
import { Megaphone, CalendarDays } from "lucide-react";
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

  return (
    <Shell
      tabs={[
        { to: "/", label: "Inicio" },
        { to: "/asistencia", label: "Asistencia" },
      ]}
    >
      {/* Resumen superior */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader
            title="Tus cursos"
            subtitle="Seleccioná para ver anuncios"
            actions={
              esCreador && cursos.length > 0 && (
                <Button onClick={() => setOpenNew(true)}>Nuevo anuncio</Button>
              )
            }
          />
          <CardBody>
            {loading ? (
              <div className="text-subtext">Cargando cursos…</div>
            ) : cursos.length === 0 ? (
              <div className="text-subtext">No hay cursos.</div>
            ) : (
              <Select value={cursoSel} onChange={(e)=>setCursoSel(e.target.value)} className="max-w-md">
                {cursos.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.nombre} — {c.anio}° {c.division || ""}
                  </option>
                ))}
              </Select>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Calendario escolar" subtitle="Próximos eventos" />
          <CardBody>
            <div className="flex items-center gap-3 text-subtext">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              <div>Muy pronto: agenda de actos y reuniones</div>
            </div>
          </CardBody>
        </Card>
      </div>

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
