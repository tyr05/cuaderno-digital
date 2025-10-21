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
app.use(cors());
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

// 6) Middlewares de auth/rol y rutas protegidas (DESPUÉS de tener app)
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
app.use("/api/users", usersRouter);

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
    uptime_seconds: process.uptime()
  });
});

// (Opcional) si querés que también exista /api/health
app.get("/api/health", (req, res) => res.redirect(307, "/health"));

// 7) Levantar servidor al final
app.listen(PORT || 5000, () => {
  console.log(`✅ Servidor en http://localhost:${PORT || 5000}`);
});
