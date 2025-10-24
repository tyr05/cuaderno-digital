// components/AddChildForm.jsx
import { useEffect, useRef, useState } from "react";

export default function AddChildForm() {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [curso, setCurso] = useState("");
  const [division, setDivision] = useState("");
  const abortRef = useRef();
  const wrapperRef = useRef(null);

  // Buscar estudiantes mientras se escribe (debounce 300ms)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setOptions([]); setOpen(false); return; }
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const url = `/api/students/search?q=${encodeURIComponent(query)}&limit=15`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Error al buscar estudiantes");
        const data = await res.json();
        setOptions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (e) {
        // opcional: mostrar error
        if (e.name !== "AbortError") {
          setOptions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Cerrar cuando se hace click afuera
  useEffect(() => {
    const handleClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const onSelect = (opt) => {
    setQuery(opt.nombre);
    setCurso(String(opt.curso));
    setDivision(String(opt.division));
    setOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // POST para vincular hijo a la familia (ajustá a tu API real)
    // await fetch(`/api/parents/${parentId}/children`, { method:"POST", body: JSON.stringify({ nombre: query, curso, division }) ... })
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 relative" ref={wrapperRef}>
      <div className="relative">
        <label className="block text-sm font-medium">Nombre del estudiante</label>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurso("");
            setDivision("");
          }}
          onFocus={() => options.length && setOpen(true)}
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Ej: María Gómez"
          autoComplete="off"
        />
        {/* Dropdown */}
        {open && (
          <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white shadow">
            {loading && <li className="px-3 py-2 text-sm text-gray-500">Buscando...</li>}
            {!loading && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
            )}
            {options.map((opt) => (
              <li
                key={`${opt.nombre}-${opt.curso}-${opt.division}`}
                className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                onMouseDown={(e) => { e.preventDefault(); onSelect(opt); }}
              >
                {opt.nombre} — {opt.curso}º {opt.division}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Curso</label>
        <input value={curso} onChange={(e)=>setCurso(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium">División</label>
        <input value={division} onChange={(e)=>setDivision(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
      </div>

      <button className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white">
        Agregar
      </button>
    </form>
  );
}
