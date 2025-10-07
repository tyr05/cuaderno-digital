// frontend/src/api.js
let toastFn = null; // se setea desde App con setApiToast()

export function setApiToast(fn) {
  toastFn = fn;
}

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
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
  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  return handle(res);
}

export async function apiPostForm(path, formData) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(), // NO agregar Content-Type; lo arma el navegador (boundary)
    body: formData,
  });
  return handle(res);
}
