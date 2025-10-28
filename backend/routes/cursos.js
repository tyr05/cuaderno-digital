// backend/routes/cursos.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Curso from "../models/Curso.js";

const router = Router();

/**
 * GET /api/cursos
 * Lista de cursos ordenada por anio, division, turno
 */
router.get(
  "/",
  requireAuth,
  requireRole("docente", "admin"),
  async (_req, res) => {
    try {
      const cursos = await Curso.find()
        .select("_id nombre anio division turno docentes alumnos")
        .sort({ anio: 1, division: 1, turno: 1 })
        .lean();

      res.json(Array.isArray(cursos) ? cursos : []);
    } catch (e) {
      console.error("Error listando cursos:", e);
      res.status(500).json({ error: "Error listando cursos" });
    }
  }
);

export default router;
