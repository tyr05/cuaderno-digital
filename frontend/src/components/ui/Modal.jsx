// frontend/src/components/ui/Modal.jsx
export default function Modal({ open, title, onClose, actions, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/30 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/95 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/60 bg-gradient-to-r from-white/80 to-white/40 p-5 rounded-t-3xl">
          <div className="font-semibold text-text">{title}</div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-subtext transition hover:bg-black/10 hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="p-5 text-sm text-text">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 border-t border-white/60 bg-white/60 px-5 py-4 rounded-b-3xl">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
