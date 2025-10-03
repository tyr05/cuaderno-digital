// frontend/src/components/ui/Toast.jsx
import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);
export function useToast() { return useContext(ToastCtx); }

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = "success", ms = 2600) => {
    const id = ++idSeq;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed z-[9999] top-4 right-4 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={
              "px-4 py-3 rounded-xl shadow-soft border " +
              (t.type === "error"
                ? "bg-red-500/15 text-red-200 border-red-500/30"
                : "bg-brand-500/15 text-brand-200 border-brand-500/30")
            }
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
