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
    <div className="flex flex-col gap-3 border-b border-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-semibold break-words">{title}</div>
        {subtitle && <div className="text-sm text-subtext">{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0 sm:self-end">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export default { Card, CardHeader, CardBody };
