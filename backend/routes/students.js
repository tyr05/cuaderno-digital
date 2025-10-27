// routes/students.js
import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Student from "../models/Student.js";
import Curso from "../models/Curso.js";
import { buildCursoFilter, buildFieldFilter } from "../utils/studentFilters.js";

const router = express.Router();

function buildCursoQuery(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  const candidates = new Set();
  candidates.add(trimmed);

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    candidates.add(numeric);
  }

  return candidates.size === 1 ? [...candidates][0] : { $in: [...candidates] };
}

function buildDivisionQuery(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

router.get("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { cursoId, curso, division } = req.query;

    const filter = {};

    if (cursoId) {
      if (!mongoose.Types.ObjectId.isValid(cursoId)) {
        return res.status(400).json({ error: "courseId inválido" });
      }

      const cursoDoc = await Curso.findById(cursoId)
        .select("anio division turno nombre")
        .lean();

      if (!cursoDoc) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const cursoValue = buildCursoQuery(cursoDoc.anio);
      const divisionValue = buildDivisionQuery(cursoDoc.division);
      if (cursoValue !== undefined) filter.curso = cursoValue;
      if (divisionValue !== undefined) filter.division = divisionValue;
    } else {
      const cursoValue = buildCursoQuery(curso);
      const divisionValue = buildDivisionQuery(division);
      if (cursoValue !== undefined) filter.curso = cursoValue;
      if (divisionValue !== undefined) filter.division = divisionValue;

      if (!filter.curso && !filter.division) {
        return res.status(400).json({ error: "Debés indicar cursoId o curso/división" });
      }
    }

    console.debug("[students] filtro", {
      cursoId: cursoId || null,
      filter,
    });

    const students = await Student.find(filter)
      .select("_id nombre curso division codigo")
      .sort({ nombre: 1 })
      .lean();

    console.debug("[students] count", students.length);

    res.json(students);
  } catch (error) {
    console.error("Error listando estudiantes por curso:", error);
    res.status(500).json({ error: "Error buscando estudiantes" });
  }
});

router.get(
  "/by-course/:courseId",
  requireAuth,
  requireRole("docente", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ error: "Identificador de curso inválido" });
      }

      const course = await Curso.findById(courseId)
        .select("anio division turno nombre")
        .lean();

      if (!course) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const filter = {};
      const cursoValue = buildCursoQuery(course.anio);
      const divisionValue = buildDivisionQuery(course.division);
      if (cursoValue !== undefined) filter.curso = cursoValue;
      if (divisionValue !== undefined) filter.division = divisionValue;

      console.debug("[students/by-course] filtro", { courseId, filter });

      const students = await Student.find(filter)
        .select("_id nombre curso division codigo")
        .sort({ nombre: 1 })
        .lean();

      console.debug("[students/by-course] count", students.length);

      res.json({
        ok: true,
        course,
        count: students.length,
        students,
      });
    } catch (error) {
      console.error("[students/by-course] Error buscando estudiantes", error);
      res.status(500).json({ error: "Error buscando estudiantes" });
    }
  },
);

/**
 * GET /api/students/search?q=mar&curso=1&division=1&limit=20
 * Búsqueda por nombre + filtros tolerantes
 */
router.get(
  "/search",
  requireAuth,
  requireRole("docente", "admin"),
  async (req, res) => {
    const { q = "", curso, division, limit = 20 } = req.query;

    try {
      // Construir filtro
      const filter = {};
      if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.nombre = { $regex: escaped, $options: "i" };
      }
      if (curso !== undefined) {
        const cursoFilter = buildCursoFilter(curso);
        if (cursoFilter) filter.curso = cursoFilter;
      }
      if (division !== undefined) {
        const divisionFilter = buildFieldFilter(division);
        if (divisionFilter) filter.division = divisionFilter;
      }

      const docs = await Student.find(filter)
        .select("nombre curso division codigo")
        .limit(Math.min(Number(limit) || 20, 50))
        .sort({ nombre: 1 })
        .lean();

      res.json(docs);
    } catch (error) {
      console.error("Error buscando estudiantes:", error);
      res.status(500).json({ error: "Error buscando estudiantes" });
    }
  },
);

export default router;
