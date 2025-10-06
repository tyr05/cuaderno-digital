import { MoreHorizontal } from "lucide-react";
import Badge from "../ui/Badge";

const palettes = {
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-100",
    accent: "text-sky-900",
    dot: "bg-sky-200",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    accent: "text-rose-900",
    dot: "bg-rose-200",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    accent: "text-amber-900",
    dot: "bg-amber-200",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-100",
    accent: "text-teal-900",
    dot: "bg-teal-200",
  },
};

export default function AnnouncementCard({
  title,
  summary,
  date,
  author,
  audience,
  course,
  tone = "sky",
  loading = false,
}) {
  if (loading) {
    return (
      <article className="rounded-3xl border border-muted/40 bg-surface/60 p-6 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded-full bg-muted/60" />
          <div className="h-4 w-12 rounded-full bg-muted/60" />
        </div>
        <div className="h-6 w-3/4 rounded-full bg-muted/60" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-muted/50" />
          <div className="h-3 w-5/6 rounded-full bg-muted/50" />
          <div className="h-3 w-2/3 rounded-full bg-muted/50" />
        </div>
        <div className="h-3 w-20 rounded-full bg-muted/60" />
      </article>
    );
  }

  const palette = palettes[tone] ?? palettes.sky;

  return (
    <article
      className={`relative flex h-full flex-col justify-between gap-4 rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette.bg} ${palette.border}`}
    >
      <div className="absolute right-6 top-6">
        <button
          type="button"
          className="rounded-full p-1 text-subtext/60 transition hover:bg-white/60 hover:text-subtext focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-subtext/80">
        {course ? <span className="font-medium">{course}</span> : null}
        {course && date ? <span>•</span> : null}
        {date ? <span>{date}</span> : null}
      </div>
      <div>
        <h3 className={`text-lg font-semibold leading-tight ${palette.accent}`}>{title}</h3>
        {summary ? (
          <p className="mt-2 text-sm text-subtext/90">
            {summary}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs text-subtext/80">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${palette.dot}`} aria-hidden="true" />
          <span>{author}</span>
        </div>
        {audience ? <Badge color="neutral">{audience}</Badge> : null}
      </div>
    </article>
  );
}
