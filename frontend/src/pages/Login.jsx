import { useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import { Card, CardBody } from "../components/ui/Card";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-surface2 to-surface">
      <Card className="w-full max-w-md">
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-brand-600 grid place-items-center shadow-soft">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Acceso — Cuaderno Digital</h1>
              <p className="text-sm text-subtext">Ingresa con tu correo y contraseña</p>
            </div>
          </div>

          {err && <div className="mb-3 text-sm text-red-300">{err}</div>}

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="text-subtext">Email</span>
              <div className="mt-1 relative">
                <Mail className="h-4 w-4 text-subtext absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  className="w-full pl-9 pr-3 py-2"
                  value={email} onChange={e=>setEmail(e.target.value)} required
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="text-subtext">Contraseña</span>
              <div className="mt-1 relative">
                <Lock className="h-4 w-4 text-subtext absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full pl-9 pr-3 py-2"
                  value={password} onChange={e=>setPassword(e.target.value)} required
                />
              </div>
            </label>

            <Button className="w-full mt-2">Entrar</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
