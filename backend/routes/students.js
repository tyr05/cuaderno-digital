// routes/students.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Student from "../models/Student.js";
import Curso from "../models/Curso.js";
import {
  buildCursoComparableFilter,
  buildCursoFilter,
  buildDivisionComparableFilter,
  buildFieldFilter,
  studentMatchesCurso,
} from "../utils/studentFilters.js";

const router = express.Router();

// Normaliza y aplica filtros de curso admitiendo combinaciones de números y textos.
function applyCursoFilters(target, ...values) {
  const cursoFilter = buildCursoFilter(...values);
  const cursoComparableFilter = buildCursoComparableFilter(...values);

  if (cursoFilter && cursoComparableFilter) {
    target.$and = target.$and || [];
    target.$and.push({ $or: [{ curso: cursoFilter }, { cursoComparable: cursoComparableFilter }] });
  } else if (cursoComparableFilter) {
    target.cursoComparable = cursoComparableFilter;
  } else if (cursoFilter) {
    target.curso = cursoFilter;
  }
}

// Igual que el curso, la división se normaliza para aceptar letras o números.
function applyDivisionFilters(target, value) {
  const divisionFilter = buildFieldFilter(value);
  const divisionComparableFilter = buildDivisionComparableFilter(value);

  if (divisionFilter && divisionComparableFilter) {
    target.$and = target.$and || [];
    target.$and.push({ $or: [{ division: divisionFilter }, { divisionComparable: divisionComparableFilter }] });
  } else if (divisionComparableFilter) {
    target.divisionComparable = divisionComparableFilter;
  } else if (divisionFilter) {
    target.division = divisionFilter;
  }
}

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

      applyCursoFilters(filter, cursoDoc.anio, cursoDoc.nombre);
      applyDivisionFilters(filter, cursoDoc.division);
    } else {
      applyCursoFilters(filter, curso);
      applyDivisionFilters(filter, division);
    }

    const hasCursoFilter = Boolean(
      filter.curso ||
        filter.cursoComparable ||
        filter.$and?.some((clause) => clause.$or?.some((cond) => "curso" in cond || "cursoComparable" in cond)),
    );
    const hasDivisionFilter = Boolean(
      filter.division ||
        filter.divisionComparable ||
        filter.$and?.some((clause) => clause.$or?.some((cond) => "division" in cond || "divisionComparable" in cond)),
    );

    if (!hasCursoFilter && !hasDivisionFilter) {
      return res.status(400).json({ error: "Debés indicar cursoId o curso/división" });
    }

    let docs = await Student.find(filter)
      .select("nombre curso division codigo")
      .sort({ nombre: 1 })
      .lean();

    if (cursoDoc && hasCursoFilter && docs.length === 0) {
      const fallbackFilter = {};
      applyDivisionFilters(fallbackFilter, cursoDoc.division);

      docs = await Student.find(fallbackFilter)
        .select("nombre curso division codigo")
        .sort({ nombre: 1 })
        .lean();
    }

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
      applyCursoFilters(filter, curso);
    }
    if (division !== undefined) {
      applyDivisionFilters(filter, division);
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
