// frontend/src/components/ui/Input.jsx
export default function Input({
  label,
  helper,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      {label && <div className="text-sm font-medium text-subtext/80">{label}</div>}
      <input
        {...props}
        className={`w-full rounded-2xl border border-white/70 bg-white/95 px-4 py-2 text-sm text-text shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-300 ${inputClassName}`}
      />
      {helper && <div className="text-xs text-subtext">{helper}</div>}
    </label>
  );
}
