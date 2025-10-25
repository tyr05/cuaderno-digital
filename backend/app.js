import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { UPLOAD_DIR } from "./middleware/upload.js";

import studentsRouter from "./routes/students.js";
import authRouter from "./routes/auth.js";
import cursosRouter from "./routes/cursos.js";
import usersRouter from "./routes/users.js";
import anunciosRouter from "./routes/anuncios.js";
import asistRouter from "./routes/asistencias.js";
import linksRouter from "./routes/links.js";
import familiasRouter from "./routes/familias.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

const ALLOWED_ORIGINS = [
  "https://cuaderno-esrn155.web.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400,
};

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    res.setHeader("Vary", "Origin");
    next();
  });
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  app.use(express.json());

  app.use("/uploads", express.static(UPLOAD_DIR));

  app.get("/", (_req, res) => res.send("Servidor funcionando 🚀"));

  app.use("/api/students", studentsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cursos", cursosRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/anuncios", anunciosRouter);
  app.use("/api/asistencias", asistRouter);
  app.use("/api/links", linksRouter);
  app.use("/api/familias", familiasRouter);

  app.get(
    "/api/secret-docente",
    requireAuth,
    requireRole("docente", "admin"),
    (req, res) => {
      res.json({ msg: `Hola ${req.user?.nombre || "docente"}, solo para docentes/admin` });
    },
  );

  app.get("/health", (req, res) => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    const dbState = states[mongoose.connection.readyState] || "unknown";
    res.json({
      ok: true,
      service: "backend",
      db: dbState,
      time: new Date().toISOString(),
      uptime_seconds: process.uptime(),
    });
  });
  app.get("/api/health", (_req, res) => res.redirect(307, "/health"));

  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return res.status(404).json({ error: "Ruta no encontrada" });
  });

  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err?.message || err);
    if (err?.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "Origen no permitido por CORS" });
    }
    res.status(500).json({ error: "Error del servidor" });
  });

  return app;
}

const app = createApp();
export default app;
