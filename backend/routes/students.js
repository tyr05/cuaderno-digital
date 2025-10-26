// routes/students.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Student from "../models/Student.js";

const router = express.Router();

// GET /api/students/search?q=mar&curso=1&division=1&limit=20
router.get("/search", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  const { q = "", curso, division, limit = 20 } = req.query;

  try {
    // Construir filtro
    const filter = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.nombre = { $regex: escaped, $options: "i" };
    }
    if (curso !== undefined) {
      const parsedCurso = Number(curso);
      if (!Number.isNaN(parsedCurso)) filter.curso = parsedCurso;
    }
    if (division !== undefined) {
      const parsedDivision = Number(division);
      filter.division = Number.isNaN(parsedDivision) ? division : parsedDivision;
    }

    const docs = await Student.find(filter)
      .select("nombre curso division")
      .limit(Math.min(Number(limit) || 20, 50))
      .lean();

    res.json(docs);
  } catch (error) {
    console.error("Error buscando estudiantes:", error);
    res.status(500).json({ error: "Error buscando estudiantes" });
  }
});

export default router;
