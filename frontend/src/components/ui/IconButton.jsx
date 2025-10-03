// frontend/src/components/ui/IconButton.jsx
export default function IconButton({ title, children, className="", ...props }) {
  return (
    <button
      title={title}
      className={`inline-grid place-items-center h-9 w-9 rounded-xl bg-muted hover:bg-card border border-muted shadow-soft ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
