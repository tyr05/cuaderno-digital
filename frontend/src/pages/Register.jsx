import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { apiPost } from "../api";
import Button from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { ShieldCheck, User, ArrowLeft } from "lucide-react";

export default function Register() {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const toastShow = toast?.show;
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      nav("/", { replace: true });
    }
  }, [user, nav]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Ingresá tu nombre completo");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/auth/register", {
        nombre: nombre.trim(),
        email: email.trim(),
        password,
      });
      toastShow?.("Cuenta creada con éxito. Iniciá sesión para vincularte con tus hijos.");
      nav("/login", { replace: true });
    } catch (e) {
      setError(e?.error || "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-surface2 to-surface">
      <Card className="w-full max-w-xl">
        <CardBody className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 grid place-items-center shadow-soft">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Crear cuenta para familias</h1>
              <p className="text-sm text-subtext">
                Registrá tu usuario para vincularte con tus hijos y seguir su asistencia.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre y apellido"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María López"
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              helper="Debe incluir al menos una letra y un número"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Crear cuenta
            </Button>
          </form>

          <div className="flex flex-col gap-2 text-sm text-subtext">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Si ya tenés usuario podés iniciar sesión para vincularte con tus hijos.</span>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700">
              <ArrowLeft className="h-4 w-4" /> Volver al acceso
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
