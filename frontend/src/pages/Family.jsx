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
import { Users, Link2, ShieldAlert } from "lucide-react";

export default function Family() {
  const { user } = useAuth();
  const toast = useToast();
  const toastShow = toast?.show;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [hijos, setHijos] = useState([]);
  const esPadre = user?.rol === "padre";

  const tabs = [
    { to: "/", label: "Inicio" },
    { to: "/asistencia", label: "Asistencia" },
    { to: "/familia", label: "Mis hijos" },
  ];

  useEffect(() => {
    if (!esPadre) return;
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
  }, [esPadre]);

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

  if (!esPadre) {
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
              Esta sección está pensada para madres, padres o tutores. Iniciá sesión con una cuenta de
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
