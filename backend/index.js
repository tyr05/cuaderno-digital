// index.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { UPLOAD_DIR } from "./middleware/upload.js";

// Routers
import studentsRouter from "./routes/students.js";
import authRouter from "./routes/auth.js";
import cursosRouter from "./routes/cursos.js";
import usersRouter from "./routes/users.js";
import anunciosRouter from "./routes/anuncios.js";
import asistRouter from "./routes/asistencias.js";
import linksRouter from "./routes/links.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

// 1) .env
dotenv.config();

// 2) App base
const app = express();
app.set("trust proxy", 1);

// 3) CORS (una sola vez, con whitelist)
const ALLOWED_ORIGINS = [
  "https://cuaderno-esrn155.web.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // añadí aquí tu dominio de Vercel/Render si el front sale de ahí
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,           // usás JWT en headers, NO cookies
  maxAge: 86400,
};

app.use((req, res, next) => {
  res.setHeader("Vary", "Origin"); // para caches/proxies
  next();
});
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 4) JSON
app.use(express.json());

// 5) DB
const { MONGO_URI, JWT_SECRET, PORT } = process.env;
if (!MONGO_URI || !JWT_SECRET) {
  console.error("❌ Faltan MONGO_URI o JWT_SECRET");
  process.exit(1);
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error MongoDB:", err.message));

// 6) Static
app.use("/uploads", express.static(UPLOAD_DIR));

// 7) Rutas
app.get("/", (_req, res) => res.send("Servidor funcionando 🚀"));

// --- estudiantes (para tu autocompletado) ---
app.use("/api/students", studentsRouter);

// resto
app.use("/api/auth", authRouter);
app.use("/api/cursos", cursosRouter);
app.use("/api/users", usersRouter);
app.use("/api/anuncios", anunciosRouter);
app.use("/api/asistencias", asistRouter);
app.use("/api/links", linksRouter);

// ejemplo protegido
app.get("/api/secret-docente", requireAuth, requireRole("docente", "admin"), (req, res) => {
  res.json({ msg: `Hola ${req.user?.nombre || "docente"}, solo para docentes/admin` });
});

// health
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  res.json({ ok: true, service: "backend", db: dbState, time: new Date().toISOString(), uptime_seconds: process.uptime() });
});
app.get("/api/health", (_req, res) => res.redirect(307, "/health"));

// 404
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return res.status(404).json({ error: "Ruta no encontrada" });
});

// errores (incluye CORS)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err?.message || err);
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origen no permitido por CORS" });
  }
  res.status(500).json({ error: "Error del servidor" });
});

// 8) Listen
app.listen(PORT || 5000, () => {
  console.log(`✅ Servidor en http://localhost:${PORT || 5000}`);
});
