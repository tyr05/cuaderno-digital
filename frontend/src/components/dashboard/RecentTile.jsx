import { Loader2 } from "lucide-react";

const palettes = {
  sky: {
    base: "bg-sky-50 border-sky-100 hover:border-sky-200",
    active: "ring-2 ring-sky-200",
    icon: "bg-sky-100 text-sky-600",
    accent: "text-sky-900",
  },
  rose: {
    base: "bg-rose-50 border-rose-100 hover:border-rose-200",
    active: "ring-2 ring-rose-200",
    icon: "bg-rose-100 text-rose-600",
    accent: "text-rose-900",
  },
  amber: {
    base: "bg-amber-50 border-amber-100 hover:border-amber-200",
    active: "ring-2 ring-amber-200",
    icon: "bg-amber-100 text-amber-600",
    accent: "text-amber-900",
  },
  teal: {
    base: "bg-teal-50 border-teal-100 hover:border-teal-200",
    active: "ring-2 ring-teal-200",
    icon: "bg-teal-100 text-teal-600",
    accent: "text-teal-900",
  },
};

export default function RecentTile({
  icon: Icon,
  title,
  subtitle,
  tone = "sky",
  active = false,
  onClick,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="h-32 rounded-3xl border border-muted/40 bg-surface/40 animate-pulse" />
    );
  }

  const palette = palettes[tone] ?? palettes.sky;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-32 w-full flex-col justify-between rounded-3xl border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-300 ${palette.base} ${active ? palette.active : ""}`}
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${palette.icon}`}>
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      </span>
      <div>
        <p className={`text-sm font-semibold ${palette.accent}`}>{title}</p>
        {subtitle ? (
          <p className="text-xs text-subtext/80">{subtitle}</p>
        ) : null}
      </div>
    </button>
  );
}
