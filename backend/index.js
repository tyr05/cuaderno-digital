// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// 1) Cargar .env primero
dotenv.config();

// 2) Crear la app y middlewares base
const app = express();
app.use(cors());
app.use(express.json());

// 3) Conectar a MongoDB
const { MONGO_URI, PORT } = process.env;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error MongoDB:", err.message));
import path from "path";
import multer from "multer";

// Servir /uploads como estático
app.use("/uploads", express.static("uploads"));

// Configurar Multer (archivos: PDF/JPG/PNG hasta 5 MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    // yyyy-mm-dd_hhmmss-original.ext
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${ts}-${safe}`);
  }
});
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
    cb(ok ? null : new Error("Tipo de archivo no permitido (solo PDF/JPG/PNG)"));
  }
});

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

// 7) Levantar servidor al final
app.listen(PORT || 5000, () => {
  console.log(`✅ Servidor en http://localhost:${PORT || 5000}`);
});
