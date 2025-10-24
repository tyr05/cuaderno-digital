// src/pages/Family.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost, apiPut, apiDelete } from "../api";
import Shell from "../components/Shell";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { Users, ShieldAlert, Bell, Pencil, Trash2, Check, X } from "lucide-react";
import { notifyOnLogin, getUnreadCount, ackAnuncio } from "../services/anuncios";

export default function Family() {
  const { user } = useAuth();
  const toast = useToast();
  const toastShow = toast?.show;

  // hijos
  const [loadingList, setLoadingList] = useState(true);
  const [hijos, setHijos] = useState([]);

  // anuncios
  const [loadingAnuncios, setLoadingAnuncios] = useState(true);
  const [anuncios, setAnuncios] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // crear hijo
  const [nuevo, setNuevo] = useState({ nombre: "", curso: "", division: "" });
  const [creating, setCreating] = useState(false);

  // edición hijo
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ nombre: "", curso: "", division: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // 🔒 Único rol familiar permitido
  const rol = (user?.rol || "").toLowerCase();
  const esFamilia = rol === "familia";

  const tabs = [
    { to: "/", label: "Inicio" },
    { to: "/asistencia", label: "Asistencia" },
    { to: "/familia", label: "Mis hijos" },
  ];

  // Helpers API
  async function getHijos() {
    return apiGet("/api/users/me/hijos");
  }
  async function createHijo(body) {
    return apiPost("/api/users/me/hijos", body);
  }
  async function updateHijo(id, body) {
    return apiPut(`/api/users/me/hijos/${id}`, body);
  }
  async function deleteHijo(id) {
    return apiDelete(`/api/users/me/hijos/${id}`);
  }

  // Cargar hijos (solo familia)
  useEffect(() => {
    if (!esFamilia) return;
    (async () => {
      setLoadingList(true);
      try {
        const data = await getHijos();
        setHijos(Array.isArray(data) ? data : []);
      } catch {
        setHijos([]);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [esFamilia]);

  // 🔔 Inicializar notificaciones + contador + lista de anuncios
  useEffect(() => {
    if (!esFamilia) return;
    (async () => {
      try {
        await notifyOnLogin(); // crea recibos "notified" para familia
      } catch (error) {
        console.warn("No se pudo inicializar notificaciones", error);
      }
      try {
        const res = await getUnreadCount();
        const count = res?.unread ?? res?.count ?? 0;
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
      setLoadingAnuncios(true);
      try {
        // backend ya filtra según rol familia
        const data = await apiGet("/api/anuncios");
        setAnuncios(Array.isArray(data) ? data : []);
      } catch {
        setAnuncios([]);
      } finally {
        setLoadingAnuncios(false);
      }
    })();
  }, [esFamilia]);

  // Marcar anuncio como leído
  async function handleMarkRead(id) {
    try {
      await ackAnuncio(id);
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      setAnuncios((prev) => prev.map((a) => (a._id === id ? { ...a, _read: true } : a)));
      toastShow?.("Anuncio marcado como leído");
    } catch {
      toastShow?.("No se pudo marcar como leído", "error");
    }
  }

  // Crear hijo
  async function handleCreate(e) {
    e?.preventDefault();
    if (!nuevo.nombre.trim()) {
      toastShow?.("El nombre es obligatorio", "error");
      return;
    }
    setCreating(true);
    try {
      await createHijo(nuevo);
      setNuevo({ nombre: "", curso: "", division: "" });
      const data = await getHijos();
      setHijos(Array.isArray(data) ? data : []);
      toastShow?.("Hijo agregado");
    } catch (error) {
      toastShow?.(error?.error || "No se pudo agregar", "error");
    } finally {
      setCreating(false);
    }
  }

  // Editar hijo
  function startEdit(h) {
    setEditId(h._id);
    setEdit({
      nombre: h.nombre || "",
      curso: h.curso || "",
      division: h.division || "",
    });
  }
  function cancelEdit() {
    setEditId(null);
    setEdit({ nombre: "", curso: "", division: "" });
  }
  async function saveEdit(id) {
    if (!edit.nombre.trim()) {
      toastShow?.("El nombre es obligatorio", "error");
      return;
    }
    setSaving(true);
    try {
      await updateHijo(id, edit);
      const data = await getHijos();
      setHijos(Array.isArray(data) ? data : []);
      cancelEdit();
      toastShow?.("Hijo actualizado");
    } catch (error) {
      toastShow?.(error?.error || "No se pudo actualizar", "error");
    } finally {
      setSaving(false);
    }
  }

  // Eliminar hijo
  async function handleDelete(id) {
    if (!confirm("¿Eliminar este hijo?")) return;
    setDeletingId(id);
    try {
      await deleteHijo(id);
      const data = await getHijos();
      setHijos(Array.isArray(data) ? data : []);
      toastShow?.("Hijo eliminado");
    } catch (error) {
      toastShow?.(error?.error || "No se pudo eliminar", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (!esFamilia) {
    return (
      <Shell
        tabs={tabs}
        title="Mis hijos"
        description="Sección disponible solo para cuentas familiares"
      >
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-12 text-center text-subtext">
            <ShieldAlert className="h-12 w-12 text-brand-500" />
            <p className="max-w-md text-sm">
              Esta sección está pensada para familias. Iniciá sesión con una cuenta de familia para
              gestionar tus hijos y ver anuncios.
            </p>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell
      tabs={tabs}
      title="Mis hijos"
      description="Gestioná los estudiantes vinculados a tu cuenta"
      addNewLabel="Agregar hijo"
    >
      {/* --- Anuncios --- */}
      <Card>
        <CardHeader
          title="Anuncios de la escuela"
          subtitle="Novedades importantes para las familias"
          actions={
            <div className="relative">
              <Bell className="h-5 w-5 text-brand-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
          }
        />
        <CardBody>
          {loadingAnuncios ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : anuncios.length === 0 ? (
            <EmptyState title="Sin anuncios" desc="Todavía no hay novedades para tu familia." />
          ) : (
            <ul className="space-y-3">
              {anuncios.map((a) => (
                <li
                  key={a._id}
                  className={`rounded-xl border border-muted p-3 shadow-sm ${
                    a._read ? "bg-gray-100" : "bg-card/60"
                  }`}
                >
                  <div className="font-semibold">{a.titulo}</div>
                  <div className="text-sm text-subtext">{a.contenido}</div>
                  {a.createdAt && (
                    <div className="text-xs text-muted mt-1">
                      {new Date(a.createdAt).toLocaleString("es-AR")}
                    </div>
                  )}
                  {!a._read && (
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={() => handleMarkRead(a._id)}>
                        Marcar como leído
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* --- Hijos + formulario --- */}
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader
            title="Estudiantes vinculados"
            subtitle="Lista de hijos o tutelados asociados a tu cuenta"
          />
          <CardBody>
            {loadingList ? (
              <div className="space-y-3">
                {[0, 1, 2].map((key) => (
                  <Skeleton key={key} className="h-16 w-full" />
                ))}
              </div>
            ) : hijos.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10 text-brand-500" />}
                title="Sin hijos cargados"
                desc="Agregá a tus hijos para comenzar a seguir su asistencia."
              />
            ) : (
              <ul className="space-y-3">
                {hijos.map((h) => (
                  <li key={h._id} className="rounded-2xl border border-muted bg-card/60 p-4 shadow-sm">
                    {editId === h._id ? (
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Input
                          label="Nombre"
                          value={edit.nombre}
                          onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                        />
                        <Input
                          label="Curso"
                          value={edit.curso}
                          onChange={(e) => setEdit({ ...edit, curso: e.target.value })}
                        />
                        <Input
                          label="División"
                          value={edit.division}
                          onChange={(e) => setEdit({ ...edit, division: e.target.value })}
                        />
                        <div className="flex gap-2 items-end">
                          <Button size="sm" onClick={() => saveEdit(h._id)} loading={saving}>
                            <Check className="h-4 w-4" /> Guardar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>
                            <X className="h-4 w-4" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-semibold text-text">{h.nombre}</div>
                          <div className="text-sm text-subtext">
                            {(h.curso || "Sin curso")} · {(h.division || "Sin división")}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(h)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(h._id)}
                            loading={deletingId === h._id}
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Agregar hijo"
            subtitle="Cargá los datos del estudiante"
          />
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nombre del estudiante"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                placeholder="María Gómez"
                required
              />
              <Input
                label="Curso"
                value={nuevo.curso}
                onChange={(e) => setNuevo({ ...nuevo, curso: e.target.value })}
                placeholder="1º 1"
              />
              <Input
                label="División"
                value={nuevo.division}
                onChange={(e) => setNuevo({ ...nuevo, division: e.target.value })}
                placeholder="TM"
              />
              <Button type="submit" className="w-full" loading={creating}>
                Agregar
              </Button>
            </form>
          </CardBody>
        </Card>
      </section>
    </Shell>
  );
}
