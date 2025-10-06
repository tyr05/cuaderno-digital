// frontend/src/components/Shell.jsx
import { LogOut, NotebookPen, Menu, Plus, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useMemo, useState } from "react";

export default function Shell({
  children,
  tabs,
  title,
  description,
  addNewLabel = "Add new",
  onAddNew,
  headerActions,
}) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTab = useMemo(() => {
    if (!tabs?.length) return null;
    return (
      tabs.find((t) => pathname === t.to) ||
      tabs.find((t) => pathname.startsWith(t.to)) ||
      tabs[0]
    );
  }, [pathname, tabs]);

  const displayTitle = title || currentTab?.label || "Panel";
  const displayDescription =
    description ||
    (user
      ? `Sesión activa de ${user.nombre}`
      : "Organizá la información académica");

  const initials = useMemo(() => {
    if (!user?.nombre) return "CD";
    return user.nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segmento) => segmento[0]?.toUpperCase())
      .join("");
  }, [user?.nombre]);

  function handleAddNew() {
    if (onAddNew) onAddNew();
  }

  const AddNewButton = ({ variant = "solid", className = "" }) => (
    <button
      type="button"
      onClick={handleAddNew}
      disabled={!onAddNew}
      className={
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 " +
        (variant === "solid"
          ? "bg-brand-500 text-white shadow-md hover:bg-brand-600"
          : "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-lg hover:from-brand-500/90 hover:to-brand-400/90") +
        (className ? ` ${className}` : "")
      }
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      <span>{addNewLabel}</span>
    </button>
  );

  const menuItems = (tabs || []).map((t) => {
    const active = pathname === t.to || pathname.startsWith(`${t.to}/`);
    return (
      <Link
        key={t.to}
        to={t.to}
        onClick={() => setSidebarOpen(false)}
        className={
          "block rounded-xl px-4 py-2 text-sm font-medium transition " +
          (active
            ? "bg-brand-100 text-brand-700 shadow-sm"
            : "text-subtext hover:bg-brand-500/10")
        }
      >
        {t.label}
      </Link>
    );
  });

  const SidebarContent = ({ showClose }) => (
    <aside className="flex h-full w-72 flex-col bg-white shadow-xl">
      <div className="flex items-center justify-between gap-3 px-6 pt-7 pb-4 border-b border-muted">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-white shadow-lg">
            <NotebookPen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Cuaderno Digital</p>
            <p className="text-xs text-subtext">{user?.rol ? `Rol: ${user.rol}` : "Gestión escolar"}</p>
          </div>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-full p-1 text-subtext transition hover:bg-brand-500/10 hover:text-brand-700"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-6 pt-5">
        <AddNewButton variant="gradient" className="w-full" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {menuItems.length > 0 ? menuItems : (
          <span className="block rounded-xl bg-surface px-4 py-2 text-sm text-subtext">
            Sin secciones disponibles
          </span>
        )}
      </nav>

      <div className="border-t border-muted px-6 py-6">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:shrink-0">
          <SidebarContent showClose={false} />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative ml-auto h-full w-72 max-w-full">
              <SidebarContent showClose />
            </div>
          </div>
        )}

        <main className="flex min-h-screen flex-1 flex-col">
          <div className="border-b border-muted bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-muted bg-surface p-2 text-subtext shadow-sm transition hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtext">
                    Inicio · {currentTab?.label || "Panel"}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">
                    {displayTitle}
                  </h1>
                  <p className="mt-1 text-sm text-subtext">{displayDescription}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {headerActions}
                <AddNewButton className="w-full sm:w-auto" />
                <div className="flex items-center gap-3 rounded-full bg-brand-500/15 px-3 py-1.5 text-brand-700 transition hover:bg-brand-500/10">
                  <div className="text-right">
                    <p className="text-sm font-semibold leading-tight">{user?.nombre || "Usuario"}</p>
                    <p className="text-xs uppercase text-brand-600/80">{user?.rol || "Invitado"}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-brand-600 font-semibold">
                    {initials}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
