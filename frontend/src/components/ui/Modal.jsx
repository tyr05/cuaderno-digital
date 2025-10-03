// frontend/src/components/ui/Modal.jsx
export default function Modal({ open, title, onClose, actions, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-muted shadow-soft">
        <div className="p-4 border-b border-muted flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-subtext hover:text-text">✕</button>
        </div>
        <div className="p-4">{children}</div>
        {actions && (
          <div className="p-4 border-t border-muted flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
