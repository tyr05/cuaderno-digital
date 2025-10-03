// frontend/src/components/Shell.jsx
import { LogOut, NotebookPen, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useState } from "react";

export default function Shell({ children, tabs }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="bg-surface2/95 border-b border-muted backdrop-blur supports-[backdrop-filter]:bg-surface2/75">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-600 grid place-items-center shadow-soft">
              <NotebookPen className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold">Cuaderno Digital</div>
              <div className="text-xs text-subtext">
                Sesión: {user?.nombre} — <span className="uppercase">{user?.rol}</span>
              </div>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-2">
            {(tabs || []).map(t => {
              const active = pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={"px-3 py-2 rounded-xl transition " + (active ? "bg-brand-500 text-black font-semibold":"hover:bg-muted")}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-black font-semibold px-3 py-2 rounded-xl transition shadow-soft"
            >
              ⤴ Salir
            </button>
            <button className="sm:hidden" aria-label="Abrir menú" onClick={() => setOpenMenu(v => !v)}>
              <Menu />
            </button>
          </div>
        </div>

        {openMenu && (
          <div className="sm:hidden border-t border-muted bg-surface2">
            <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
              {(tabs || []).map(t => (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => setOpenMenu(false)}
                  className={"px-3 py-2 rounded-xl hover:bg-muted " + (pathname === t.to ? "bg-brand-500 text-black font-semibold" : "")}
                >
                  {t.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="mt-1 px-3 py-2 rounded-xl bg-brand-500 text-black font-semibold"
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
