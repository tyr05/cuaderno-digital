export default function Badge({ children, color="brand" }) {
  const palette = {
    brand: "bg-brand-500/20 text-brand-700 ring-1 ring-brand-500/25",
    neutral: "bg-muted text-subtext ring-1 ring-black/10",
    success: "bg-emerald-500/20 text-emerald-900 ring-1 ring-emerald-500/25",
    warn: "bg-amber-500/20 text-amber-800 ring-1 ring-amber-500/25",
    danger: "bg-red-500/20 text-red-800 ring-1 ring-red-500/25",
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs ${palette[color]}`}>
      {children}
    </span>
  );
}
