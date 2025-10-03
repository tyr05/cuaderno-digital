// frontend/src/components/ui/Input.jsx
export default function Input({ label, helper, className="", ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-sm text-subtext mb-1">{label}</div>}
      <input {...props} className="w-full" />
      {helper && <div className="mt-1 text-xs text-subtext">{helper}</div>}
    </label>
  );
}
