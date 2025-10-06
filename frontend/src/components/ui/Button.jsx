// frontend/src/components/ui/Button.jsx
export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}) {
  const { disabled, ...rest } = props;

  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl font-semibold " +
    "transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent " +
    "shadow-soft disabled:opacity-60 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-brand-500 text-slate-900 hover:bg-brand-400 focus:ring-brand-200",
    secondary:
      "bg-white/80 text-text border border-white/60 hover:bg-white focus:ring-brand-100",
    soft:
      "bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 focus:ring-brand-200",
    outline:
      "bg-transparent text-brand-500 border border-brand-200 hover:bg-brand-500/10 focus:ring-brand-200",
    ghost: "bg-transparent text-subtext hover:bg-muted/60 border border-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-200",
    success:
      "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 focus:ring-emerald-200",
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
      )}
      {children}
    </button>
  );
}
