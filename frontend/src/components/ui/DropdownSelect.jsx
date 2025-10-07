import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export default function DropdownSelect({
  label,
  helper,
  className = "",
  buttonClassName = "",
  placeholder = "Seleccionar…",
  value,
  onChange,
  options = [],
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSelect(option) {
    if (disabled) return;
    onChange?.(option.value, option);
    setOpen(false);
  }

  return (
    <label ref={containerRef} className={`block space-y-1.5 ${className}`}>
      {label && <div className="text-sm font-medium text-subtext/80">{label}</div>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-left text-sm font-medium text-text shadow-soft transition focus:outline-none focus:ring-4 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          {selected ? (
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-text">{selected.title}</span>
              {selected.subtitle && (
                <span className="text-xs text-subtext">{selected.subtitle}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-subtext">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-3 h-4 w-4 flex-shrink-0 text-subtext/70" aria-hidden="true" />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-muted bg-white/95 p-1 shadow-2xl backdrop-blur"
          >
            {options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-subtext">Sin opciones disponibles</li>
            ) : (
              options.map((option) => {
                const isActive = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400/40 ${
                        isActive
                          ? "bg-brand-100/70 text-brand-700"
                          : "text-text hover:bg-brand-50"
                      }`}
                      onClick={() => handleSelect(option)}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">{option.title}</span>
                        {option.subtitle && (
                          <span className="text-xs text-subtext">{option.subtitle}</span>
                        )}
                      </div>
                      {isActive && (
                        <Check className="h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      {helper && <div className="text-xs text-subtext">{helper}</div>}
    </label>
  );
}
