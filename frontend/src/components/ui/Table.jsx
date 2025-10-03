// frontend/src/components/ui/Table.jsx
export function Table({ children }) {
  return <div className="overflow-x-auto rounded-2xl border border-muted bg-card">{children}</div>;
}
export function THead({ children }) {
  return <thead className="bg-surface text-subtext">{children}</thead>;
}
export function TRow({ children }) {
  return <tr className="border-t border-muted">{children}</tr>;
}
export function TH({ children }) {
  return <th className="p-3 text-left text-sm">{children}</th>;
}
export function TD({ children, className="" }) {
  return <td className={`p-3 align-middle ${className}`}>{children}</td>;
}
