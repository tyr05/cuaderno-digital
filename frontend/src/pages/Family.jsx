import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { apiGet, apiPost } from "../api";
import Shell from "../components/Shell";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { Users, Link2, ShieldAlert, Bell } from "lucide-react";
import { notifyOnLogin, getUnreadCount, ackAnuncio } from "../services/anuncios";

export default function Family() {
  const { user } = useAuth();
  const toast = useToast();
  const toastShow = toast?.show;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // hijos
  const [loadingList, setLoadingList] = useState(true);
  const [hijos, setHijos] = useState([]);

  // anuncios
  const [loadingAnuncios, setLoadingAnuncios] = useState(true);
  const [anuncios, setAnuncios] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Rol familia/tutor 
const rol = (user?.rol || "").toLowerCase();
const esFamilia = ["familia", "tutor", "padre"].includes(rol);

  const tabs = [
    { to: "/", label: "Inicio" },
    { to: "/asistencia", label: "Asistencia" },
    { to: "/familia", label: "Mis hijos" },
  ];

  // Cargar hijos
  useEffect(() => {
    if (!esFamilia) return;
    (async () => {
      setLoadingList(true);
      try {
        const data = await apiGet("/api/users/me/hijos");
        setHijos(Array.isArray(data) ? data : []);
      } catch {
        setHijos([]);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [esFamilia]);

  // 🔔 Inicializar notificaciones + cargar anuncios y contador
  useEffect(() => {
    if (!esFamilia) return;
    (async () => {
      try {
        // registra “notified” en backend
        await notifyOnLogin();
      } catch {}
      try {
        // contador badge
        const res = await getUnreadCount();
        const count = res?.unread ?? res?.count ?? 0;
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
      // cargar lista de anuncios visibles (backend ya filtra por rol)
      setLoadingAnuncios(true);
      try {
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
      // opcional: atenuar tarjeta
      setAnuncios((prev) => prev.map((a) => (a._id === id ? { ...a, _read: true } : a)));
      toastShow?.("Anuncio marcado como leído");
    } catch {
      toastShow?.("No se pudo marcar como leído", "error");
    }
  }

  async function handleLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await apiPost("/api/users/me/hijos", { email });
      toastShow?.("Estudiante vinculado");
      setEmail("");
      const data = await apiGet("/api/users/me/hijos");
      setHijos(Array.isArray(data) ? data : []);
    } catch (error) {
      toastShow?.(error?.error || "No se pudo vincular al estudiante", "error");
    } finally {
      setLoading(false);
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
              Esta sección está pensada para familias o tutores. Iniciá sesión con una cuenta de
              familia para vincular estudiantes.
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
      {/* --- Anuncios arriba de todo --- */}
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
            <EmptyState
              title="Sin anuncios"
              desc="Todavía no hay novedades para tu familia."
            />
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

      {/* --- Resto del contenido de familia --- */}
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
                title="Sin estudiantes vinculados"
                desc="Agregá el correo electrónico del estudiante para comenzar a seguir su asistencia."
              />
            ) : (
              <ul className="space-y-3">
                {hijos.map((hijo) => (
                  <li
                    key={hijo.id}
                    className="rounded-2xl border border-muted bg-card/60 p-4 shadow-sm"
                  >
                    <div className="font-semibold text-text">{hijo.nombre}</div>
                    <div className="text-sm text-subtext">{hijo.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Vincular un nuevo estudiante"
            subtitle="Necesitás el correo institucional del estudiante"
          />
          <CardBody>
            <form onSubmit={handleLink} className="space-y-4">
              <Input
                label="Correo del estudiante"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="estudiante@colegio.edu"
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                <Link2 className="h-4 w-4" /> Vincular
              </Button>
            </form>
            <p className="mt-4 text-xs text-subtext">
              Si no conocés el correo institucional, solicitá la información a la escuela para completar el
              vínculo.
            </p>
          </CardBody>
        </Card>
      </section>
    </Shell>
  );
}
