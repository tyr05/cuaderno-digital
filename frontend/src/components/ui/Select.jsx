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
      <select
        {...props}
        className={`w-full rounded-2xl border border-white/70 bg-white px-4 py-2 text-sm text-text shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-300 ${selectClassName}`}
      >
        {children}
      </select>
      {helper && <div className="text-xs text-subtext">{helper}</div>}
    </label>
  );
}
