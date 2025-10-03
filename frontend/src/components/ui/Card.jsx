// frontend/src/components/ui/Card.jsx
export function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-muted bg-card shadow-soft " +
        "hover:shadow-[0_0_0_1px_rgba(34,197,94,.35)] transition " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="p-4 border-b border-muted flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-sm text-subtext">{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export default { Card, CardHeader, CardBody };
