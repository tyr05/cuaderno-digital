// frontend/src/api.js
let toastFn = null; // se setea desde App con setApiToast()

export function setApiToast(fn) {
  toastFn = fn;
}

function isLoopback(hostname = "") {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);

      if (
        typeof window !== "undefined" &&
        isLoopback(parsed.hostname) &&
        window.location.hostname &&
        !isLoopback(window.location.hostname)
      ) {
        const port = parsed.port ? `:${parsed.port}` : "";
        const pathname = parsed.pathname.replace(/\/$/, "");
        return `${parsed.protocol}//${window.location.hostname}${port}${pathname}`;
      }

      return parsed.origin + parsed.pathname.replace(/\/$/, "");
    } catch (error) {
      console.warn("VITE_API_URL inválida, usando valor tal cual", error);
      return envUrl.replace(/\/$/, "");
    }
  }

  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }

  const { protocol, hostname } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.endsWith(".local");

  if (isLocalHost) {
    const apiPort = import.meta.env.VITE_API_PORT || "5000";
    return `${protocol}//${hostname}:${apiPort}`;
  }

  return window.location.origin;
}

const BASE = resolveBaseUrl();

function buildUrl(path) {
  if (path instanceof URL) {
    return path.toString();
  }

  if (typeof path !== "string") {
    throw new TypeError("El path de la API debe ser una cadena o URL válida");
  }

  const trimmed = path.trim();

  if (!trimmed) {
    throw new Error("El path de la API no puede estar vacío");
  }

  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(trimmed);

  if (isAbsolute) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  try {
    return new URL(normalizedPath, BASE).toString();
  } catch (error) {
    console.warn("No se pudo crear la URL de la API", error);
    const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
    return `${base}${normalizedPath}`;
  }
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
}

async function handle(res) {
  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { error: res.statusText || "Error de red" };
    }
    if (toastFn) toastFn(err.error || "Error", "error");
    throw err;
  }
  // algunos endpoints devuelven 204
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function apiGet(path) {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(buildUrl(path), {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  return handle(res);
}

export async function apiPostForm(path, formData) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: authHeaders(), // NO agregar Content-Type; lo arma el navegador (boundary)
    body: formData,
  });
  return handle(res);
}
