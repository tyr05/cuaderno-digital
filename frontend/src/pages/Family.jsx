// src/pages/Family.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost, apiDelete } from "../api";
import Shell from "../components/Shell";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { Users, ShieldAlert, Bell, Trash2 } from "lucide-react";
import { notifyOnLogin, getUnreadCount, ackAnuncio } from "../services/anuncios";

const CODE_REGEX = /^[A-Z]{3}-\d{2}-\d{3}$/;

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

  // vincular por código
  const [codigo, setCodigo] = useState("");
  const [linking, setLinking] = useState(false);
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
    const res = await apiGet("/api/familias/mis-hijos");
    return Array.isArray(res?.hijos) ? res.hijos : [];
  }
  async function linkHijo(body) {
    return apiPost("/api/familias/vinculos", body);
  }
  async function deleteHijo(id) {
    return apiDelete(`/api/familias/vinculos/${id}`);
  }

  // Cargar hijos (solo familia)
  useEffect(() => {
    if (!esFamilia) return;
    (async () => {
      setLoadingList(true);
      try {
        const data = await getHijos();
        setHijos(data);
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

  // Vincular hijo por código
  async function handleLink(e) {
    e?.preventDefault();
    const value = codigo.trim();
    if (!value) {
      toastShow?.("Ingresá un código válido", "error");
      return;
    }
    setLinking(true);
    try {
      const uppercase = value.toUpperCase();
      setCodigo(uppercase);
      if (!CODE_REGEX.test(uppercase)) {
        toastShow?.("Ingresá un código con formato AAA-00-000", "error");
        return;
      }
      const res = await linkHijo({ codigo: uppercase });
      setCodigo("");
      const data = await getHijos();
      setHijos(data);
      const msg = res?.message || res?.msg || "Estudiante vinculado";
      toastShow?.(msg);
    } catch (error) {
      let message = error?.error || "No se pudo vincular";
      if (error?.status === 404) message = "No encontramos un estudiante con ese código";
      else if (error?.status === 409) message = "El código ya fue utilizado";
      else if (error?.status === 400) message = "Revisá el formato del código (AAA-00-000)";
      toastShow?.(message, "error");
    } finally {
      setLinking(false);
    }
  }

  // Eliminar hijo
  async function handleDelete(id) {
    if (!confirm("¿Desvincular este estudiante?")) return;
    setDeletingId(id);
    try {
      const res = await deleteHijo(id);
      const data = await getHijos();
      setHijos(data);
      toastShow?.(res?.message || "Vínculo eliminado");
    } catch (error) {
      toastShow?.(error?.error || "No se pudo desvincular", "error");
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
      addNewLabel="Vincular estudiante"
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
                desc="Todavía no vinculaste estudiantes. Usá el código entregado por la escuela para sumarlos."
              />
            ) : (
              <ul className="space-y-3">
                {hijos.map((h) => (
                  <li
                    key={h.studentId || h._id || h.codigo}
                    className="rounded-2xl border border-muted bg-card/60 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-text">{h.nombre}</div>
                        <div className="text-sm text-subtext">
                          {(h.curso ?? "Sin curso")} · {(h.division ?? "Sin división")}
                        </div>
                        <div className="text-xs text-muted mt-1 font-mono">
                          Código: {h.codigo}
                        </div>
                        {h.linkedAt && (
                          <div className="text-xs text-muted mt-1">
                            Vinculado el {new Date(h.linkedAt).toLocaleDateString("es-AR")}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(h.studentId)}
                          loading={deletingId === h.studentId}
                        >
                          <Trash2 className="h-4 w-4" /> Desvincular
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Vincular por código"
            subtitle="Ingresá el código único que te entregó la escuela"
          />
          <CardBody>
            <form onSubmit={handleLink} className="space-y-4">
              <Input
                label="Código de estudiante"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="BJZ-11-001"
                disabled={linking}
                required
              />
              <p className="text-xs text-subtext">
                Cada estudiante tiene un código único. Solo se puede usar una vez por familia.
              </p>
              <Button type="submit" className="w-full" loading={linking}>
                Vincular
              </Button>
            </form>
          </CardBody>
        </Card>
      </section>
    </Shell>
  );
}
