import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const { authorization } = req.headers; // "Bearer <token>"
  if (!authorization) return res.status(401).json({ error: "Falta token" });

  const [type, token] = authorization.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "Token inválido" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { uid, rol, nombre, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRole(...rolesPermitidos) {
  const normalized = rolesPermitidos
    .map((rol) => (typeof rol === "string" ? rol.toLowerCase() : null))
    .filter(Boolean);

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });

    const userRole = String(req.user.rol || req.user.role || "").toLowerCase();
    if (!normalized.includes(userRole)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    next();
  };
}
