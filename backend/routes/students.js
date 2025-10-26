// routes/students.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Student from "../models/Student.js";
import Curso from "../models/Curso.js";

function buildComparableValues(raw) {
  if (raw === undefined || raw === null) return [];

  const values = new Set();
  const asString = String(raw).trim();
  if (asString) {
    values.add(asString);
    const asNumber = Number(asString);
    if (!Number.isNaN(asNumber)) {
      values.add(asNumber);
    }
  }

  if (typeof raw === "number" && !Number.isNaN(raw)) {
    values.add(raw);
    values.add(String(raw));
  }

  return Array.from(values);
}

function buildFieldFilter(raw) {
  const values = buildComparableValues(raw);
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];
  return { $in: values };
}

function normalizeForCompare(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}

function studentMatchesCurso(student, cursoDoc) {
  if (!student || !cursoDoc) return false;

  const matchesCurso =
    normalizeForCompare(student.curso) === normalizeForCompare(cursoDoc.anio ?? cursoDoc.nombre);

  if (!matchesCurso) return false;

  const cursoDivision = normalizeForCompare(cursoDoc.division);
  if (!cursoDivision) return true;

  return normalizeForCompare(student.division) === cursoDivision;
}

const router = express.Router();

router.get("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { cursoId, curso, division } = req.query;

    const filter = {};
    let cursoDoc = null;

    if (cursoId) {
      cursoDoc = await Curso.findById(cursoId).select("anio division nombre").lean();
      if (!cursoDoc) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const cursoFilter = buildFieldFilter(cursoDoc.anio ?? cursoDoc.nombre);
      if (cursoFilter) filter.curso = cursoFilter;

      const divisionFilter = buildFieldFilter(cursoDoc.division);
      if (divisionFilter) filter.division = divisionFilter;
    } else {
      const cursoFilter = buildFieldFilter(curso);
      if (cursoFilter) filter.curso = cursoFilter;

      const divisionFilter = buildFieldFilter(division);
      if (divisionFilter) filter.division = divisionFilter;
    }

    if (!filter.curso && !filter.division) {
      return res.status(400).json({ error: "Debés indicar cursoId o curso/división" });
    }

    const docs = await Student.find(filter)
      .select("nombre curso division codigo")
      .sort({ nombre: 1 })
      .lean();

    if (cursoDoc) {
      const filtered = docs.filter((student) => studentMatchesCurso(student, cursoDoc));
      return res.json(filtered);
    }

    res.json(docs);
  } catch (error) {
    console.error("Error listando estudiantes por curso:", error);
    res.status(500).json({ error: "Error buscando estudiantes" });
  }
});

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
      const cursoFilter = buildFieldFilter(curso);
      if (cursoFilter) filter.curso = cursoFilter;
    }
    if (division !== undefined) {
      const divisionFilter = buildFieldFilter(division);
      if (divisionFilter) filter.division = divisionFilter;
    }

    const docs = await Student.find(filter)
      .select("nombre curso division codigo")
      .limit(Math.min(Number(limit) || 20, 50))
      .lean();

    res.json(docs);
  } catch (error) {
    console.error("Error buscando estudiantes:", error);
    res.status(500).json({ error: "Error buscando estudiantes" });
  }
});

export default router;
