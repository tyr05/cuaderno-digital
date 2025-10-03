// frontend/src/components/ui/Select.jsx
export default function Select({ label, helper, className="", children, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-sm text-subtext mb-1">{label}</div>}
      <select {...props} className="w-full">{children}</select>
      {helper && <div className="mt-1 text-xs text-subtext">{helper}</div>}
    </label>
  );
}
