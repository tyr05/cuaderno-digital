// frontend/src/components/ui/Button.jsx
export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl " +
    "font-semibold transition shadow-soft disabled:opacity-60 disabled:pointer-events-none";

  const variants = {
    primary: "bg-brand-500 text-black hover:bg-brand-600",
    subtle: "bg-muted text-text hover:bg-card border border-muted",
    ghost: "bg-transparent text-text hover:bg-muted border border-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {loading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
      )}
      {children}
    </button>
  );
}
