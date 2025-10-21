// frontend/src/components/Shell.jsx
import {
  Bell,
  LogOut,
  NotebookPen,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import {
  cloneElement,
  createElement,
  isValidElement,
  useMemo,
  useState,
} from "react";

export default function Shell({
  children,
  tabs,
  title,
  description,
  addNewLabel = "Add new",
  onAddNew,
  headerActions,
  searchPlaceholder = "Buscar en Cuaderno Digital",
  quickActions,
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
          "block rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm transition " +
          (active
            ? "bg-brand-500/20 text-brand-700"
            : "bg-white/60 text-subtext hover:bg-white/80 hover:text-brand-700")
        }
      >
        {t.label}
      </Link>
    );
  });

  const SidebarContent = ({ showClose }) => (
    <aside className="relative flex h-full w-full max-w-[18rem] flex-col overflow-hidden rounded-[3rem] bg-gradient-to-b from-brand-200 via-brand-100 to-surface shadow-[0_25px_60px_-30px_rgba(14,53,33,0.6)] lg:rounded-l-none lg:rounded-r-[3rem]">
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-40 rounded-full bg-brand-500/30 blur-3xl"
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-5 px-6 py-7">
        <div className="relative flex items-center justify-between gap-3 rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-md backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-white shadow-lg">
              <NotebookPen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Cuaderno Digital</p>
              <p className="text-xs text-subtext">
                {user?.rol ? `Rol: ${user.rol}` : "Gestión escolar"}
              </p>
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

        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-4 shadow-md backdrop-blur">
          <AddNewButton variant="gradient" className="w-full" />
        </div>

        <div className="flex-1 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 p-3 shadow-md backdrop-blur">
          <nav className="flex h-full flex-col gap-2 overflow-y-auto">
            {menuItems.length > 0 ? (
              menuItems
            ) : (
              <span className="block rounded-2xl bg-white/80 px-4 py-2 text-sm text-subtext shadow-sm">
                Sin secciones disponibles
              </span>
            )}
          </nav>
        </div>

        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-4 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );

  const resolvedQuickActions = quickActions?.length
    ? quickActions
    : [
        {
          key: "notifications",
          icon: Bell,
          label: "Ver notificaciones",
        },
        {
          key: "settings",
          icon: Settings,
          label: "Abrir ajustes",
        },
      ];

  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:shrink-0 lg:pl-4 lg:pr-6 lg:pt-6">
          <SidebarContent showClose={false} />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative ml-auto flex h-full w-full max-w-[20rem] items-stretch p-4">
              <SidebarContent showClose />
            </div>
          </div>
        )}

        <main className="flex min-h-screen flex-1 flex-col">
          <div className="border-b border-muted bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-muted bg-surface p-2 text-subtext shadow-sm transition hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtext">
                    Inicio · {currentTab?.label || "Panel"}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">
                    {displayTitle}
                  </h1>
                  <p className="mt-1 text-sm text-subtext">{displayDescription}</p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {headerActions}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <label className="flex w-full items-center gap-3 rounded-full bg-white px-4 py-2 shadow-soft ring-1 ring-transparent transition focus-within:ring-2 focus-within:ring-brand-200 sm:max-w-sm lg:min-w-[22rem]">
                    <Search className="h-4 w-4 text-subtext" aria-hidden="true" />
                    <span className="sr-only">Buscar</span>
                    <input
                      type="search"
                      placeholder={searchPlaceholder}
                      className="w-full border-0 bg-transparent text-sm text-text placeholder:text-subtext focus:outline-none"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {resolvedQuickActions.map((action) => {
                      const { icon } = action;

                      let iconContent;

                      if (isValidElement(icon)) {
                        const existingClassName = icon.props?.className;
                        const mergedClassName = ["h-5 w-5", existingClassName]
                          .filter(Boolean)
                          .join(" ");

                        iconContent = cloneElement(icon, {
                          className: mergedClassName,
                          "aria-hidden": "true",
                        });
                      } else if (typeof icon === "function") {
                        const IconComponent = icon;
                        iconContent = (
                          <IconComponent className="h-5 w-5" aria-hidden="true" />
                        );
                      } else if (
                        icon &&
                        typeof icon === "object" &&
                        ("render" in icon || "type" in icon || "$$typeof" in icon)
                      ) {
                        iconContent = createElement(icon, {
                          className: "h-5 w-5",
                          "aria-hidden": "true",
                        });
                      } else {
                        iconContent = icon;
                      }

                      return (
                        <button
                          key={action.key || action.label}
                          type="button"
                          onClick={action.onClick}
                          className={
                            "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-subtext shadow-soft transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200" +
                            (action.className ? ` ${action.className}` : "")
                          }
                          aria-label={action.label || "Acción rápida"}
                        >
                          {iconContent}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
