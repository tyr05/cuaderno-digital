// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { UPLOAD_DIR } from "./middleware/upload.js";

// 1) Cargar .env primero
dotenv.config();

// 2) Crear la app y middlewares base
const app = express();

// (Render/proxies) para que req.ip / req.secure funcionen ok detrás de proxy
app.set("trust proxy", 1);

// ---- CORS: definir whitelist y habilitar preflight en TODAS las rutas ----
const ALLOWED_ORIGINS = [
  "https://cuaderno-esrn155.web.app", // tu hosting de Firebase
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin(origin, callback) {
    // Permitir llamadas sin Origin (curl/Postman) y las de la whitelist
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // credentials: false, // dejalo en false si usás JWT en headers (sin cookies)
  maxAge: 86400, // cachea preflight 24h
};
// Sugerido para caches/proxies intermedios
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});
app.use(cors(corsOptions));
// Responder preflight para TODAS las rutas
app.options("*", cors(corsOptions));

app.use(express.json());

// 3) Validar variables de entorno críticas y conectar a MongoDB
const { MONGO_URI, JWT_SECRET, PORT } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error(
    "❌ Configuración inválida: asegúrate de definir MONGO_URI y JWT_SECRET antes de iniciar el servidor."
  );
  process.exit(1);
}

console.log("✅ Variables de entorno críticas presentes (MONGO_URI, JWT_SECRET).");

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error MongoDB:", err.message));

// Servir /uploads como estático reutilizando la misma configuración centralizada
app.use("/uploads", express.static(UPLOAD_DIR));

// 4) Rutas simples de vida
app.get("/", (_req, res) => {
  res.send("Servidor funcionando 🚀");
});

// 5) Rutas de negocio: importar y montar routers DESPUÉS de crear app
import authRouter from "./routes/auth.js";
app.use("/api/auth", authRouter);

import cursosRouter from "./routes/cursos.js";
app.use("/api/cursos", cursosRouter);

import usersRouter from "./routes/users.js";
app.use("/api/users", usersRouter);

import { requireAuth, requireRole } from "./middleware/auth.js";
app.get(
  "/api/secret-docente",
  requireAuth,
  requireRole("docente", "admin"),
  (req, res) => {
    res.json({ msg: `Hola ${req.user.nombre}, solo para docentes/admin` });
  }
);

import anunciosRouter from "./routes/anuncios.js";
app.use("/api/anuncios", anunciosRouter);

import asistRouter from "./routes/asistencias.js";
app.use("/api/asistencias", asistRouter);

import linksRouter from "./routes/links.js";
app.use("/api/links", linksRouter);

// --- Ruta de salud (para monitoreo y pruebas) ---
app.get("/health", (req, res) => {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState =
    (typeof mongoose !== "undefined" &&
      mongoose.connection &&
      states[mongoose.connection.readyState]) || "unknown";

  res.json({
    ok: true,
    service: "backend",
    db: dbState,
    time: new Date().toISOString(),
    uptime_seconds: process.uptime(),
  });
});

// (Opcional) si querés que también exista /api/health
app.get("/api/health", (req, res) => res.redirect(307, "/health"));

// Manejo 404 (evita que OPTIONS caiga acá)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo de errores (incluye errores de CORS)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origen no permitido por CORS" });
  }
  res.status(500).json({ error: "Error del servidor" });
});

// 7) Levantar servidor al final
app.listen(PORT || 5000, () => {
  console.log(`✅ Servidor en http://localhost:${PORT || 5000}`);
});
