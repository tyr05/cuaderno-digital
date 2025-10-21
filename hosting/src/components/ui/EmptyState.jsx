// frontend/src/components/ui/EmptyState.jsx
export default function EmptyState({ icon=null, title="Sin datos", desc="" }) {
  return (
    <div className="text-center py-10 text-subtext">
      {icon && <div className="mx-auto mb-3 h-10 w-10 opacity-70">{icon}</div>}
      <div className="font-semibold text-text">{title}</div>
      {desc && <div className="text-sm mt-1">{desc}</div>}
    </div>
  );
}
