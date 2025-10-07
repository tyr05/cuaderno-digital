// frontend/src/components/ui/Select.jsx
export default function Select({
  label,
  helper,
  className = "",
  selectClassName = "",
  children,
  ...props
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      {label && <div className="text-sm font-medium text-subtext/80">{label}</div>}
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none rounded-2xl border border-white/70 bg-white/90 px-4 py-2 pr-12 text-sm font-medium text-text shadow-soft transition focus:border-brand-200 focus:outline-none focus:ring-4 focus:ring-brand-400/30 ${selectClassName}`}
        >
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-lg text-subtext/70"
        >
          ▾
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 right-2 w-10 rounded-2xl bg-gradient-to-l from-white/70 via-white/40 to-transparent"
        />
      </div>
      {helper && <div className="text-xs text-subtext">{helper}</div>}
    </label>
  );
}
