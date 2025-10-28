// backend/app.js
import express from "express";
import cors from "cors";

// Rutas
import authRouter from "./routes/auth.js";
import cursosRouter from "./routes/cursos.js";
import studentsRouter from "./routes/students.js";
import anunciosRouter from "./routes/anuncios.js";
import usersRouter from "./routes/users.js";

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// Montaje de rutas (IMPORTANTE)
app.use("/api/auth", authRouter);         // registro/login (emite JWT con rol)
app.use("/api/cursos", cursosRouter);     // lista cursos
app.use("/api/students", studentsRouter); // estudiantes por curso (_id → anio/division)
app.use("/api/anuncios", anunciosRouter); // anuncios (curso/alumno)
app.use("/api/users", usersRouter);       // gestión de familia/hijos

export default app;
