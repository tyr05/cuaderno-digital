export default function Badge({ children, color="brand" }) {
  const palette = {
    brand: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20",
    neutral: "bg-muted text-subtext ring-1 ring-black/10",
    success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
    warn: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
    danger: "bg-red-500/15 text-red-300 ring-1 ring-red-500/20",
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs ${palette[color]}`}>
      {children}
    </span>
  );
}
