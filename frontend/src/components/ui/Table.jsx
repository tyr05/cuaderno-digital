// frontend/src/components/ui/Table.jsx
export function Table({ children, variant = "default", className = "" }) {
  const variants = {
    default: "border border-muted bg-card",
    soft:
      "border border-white/60 bg-white/70 backdrop-blur-sm shadow-inner ring-1 ring-black/5",
  };

  return (
    <div className={`overflow-x-auto rounded-3xl ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
}

export function THead({ children, className = "", ...props }) {
  return (
    <thead
      className={`text-xs uppercase tracking-wide text-subtext/80 bg-white/60 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TRow({ children, className = "", ...props }) {
  return (
    <tr
      className={`transition-colors border-t border-white/60 first:border-t-0 hover:bg-white/70 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TH({ children, className = "", ...props }) {
  return (
    <th className={`p-4 text-left text-sm font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TD({ children, className = "", ...props }) {
  return (
    <td className={`p-4 align-middle text-sm ${className}`} {...props}>
      {children}
    </td>
  );
}
