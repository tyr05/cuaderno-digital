// routes/students.js
import express from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Student from "../models/Student.js";
import Curso from "../models/Curso.js";

const router = express.Router();

/* =========================
   Utilidades de normalización / filtros
   ========================= */
function buildComparableValues(raw) {
  if (raw === undefined || raw === null) return [];
  const values = new Set();
  const asString = String(raw).trim();
  if (asString) {
    values.add(asString);
    const asNumber = Number(asString);
    if (!Number.isNaN(asNumber)) values.add(asNumber);
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
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function normalizeCursoForCompare(value) {
  const normalized = normalizeForCompare(value);
  if (!normalized) return "";
  return normalized.replace(/[º°]/g, "").replace(/\s+/g, "");
}

function buildCursoFilter(...rawValues) {
  const values = new Set();
  rawValues.forEach((raw) => {
    buildComparableValues(raw).forEach((val) => {
      if (val !== "" && val !== undefined && val !== null) values.add(val);
    });

    const asString = String(raw ?? "").trim();
    if (asString) {
      values.add(asString);

      const withoutOrdinal = asString.replace(/[º°]/g, "").trim();
      if (withoutOrdinal) {
        values.add(withoutOrdinal);
        const numeric = Number(withoutOrdinal);
        if (!Number.isNaN(numeric)) values.add(numeric);
      }

      const digitsOnly = asString.replace(/[^0-9]/g, "");
      if (digitsOnly) {
        values.add(digitsOnly);
        values.add(`${digitsOnly}°`);
        values.add(`${digitsOnly}º`);
        const asNumber = Number(digitsOnly);
        if (!Number.isNaN(asNumber)) values.add(asNumber);
      }
    }

    const normalizedCurso = normalizeCursoForCompare(raw);
    if (normalizedCurso) values.add(normalizedCurso);
  });

  const result = Array.from(values).filter((val) => val !== "");
  if (result.length === 0) return undefined;
  if (result.length === 1) return result[0];
  return { $in: result };
}

/* =========================
   Rutas
   ========================= */

/**
 * GET /api/students/by-course/:courseId
 * Devuelve estudiantes del curso (usa "cursos" → anio/division → "estudiantes")
 */
router.get(
  "/by-course/:courseId",
  requireAuth,
  requireRole("docente", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ ok: false, msg: "courseId inválido" });
      }

      const course = await Curso.findById(courseId)
        .select("anio division nombre turno")
        .lean();

      if (!course) {
        return res.status(404).json({ ok: false, msg: "Curso no encontrado" });
      }

      // Filtro ESTRICTO para colección "estudiantes"
      const filter = {
        curso: Number(course.anio),
        division: String(course.division),
      };

      const students = await Student.find(filter)
        .select("nombre curso division codigo")
        .sort({ nombre: 1 })
        .lean();

      return res.json({
        ok: true,
        course,
        count: students.length,
        students,
      });
    } catch (e) {
      console.error("GET /api/students/by-course error:", e);
      return res
        .status(500)
        .json({ ok: false, msg: "Error listando estudiantes" });
    }
  }
);

/**
 * GET /api/students?cursoId=... | ?curso=1&division=1
 * - Si viene cursoId: usa filtro ESTRICTO por anio/division del doc en "cursos"
 * - Si viene curso/division: usa filtros tolerantes para búsquedas libres
 */
router.get("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { cursoId, curso, division } = req.query;

    const filter = {};
    let usedCursoId = false;

    if (cursoId) {
      const cursoDoc = await Curso.findById(cursoId)
        .select("anio division")
        .lean();
      if (!cursoDoc) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      // Filtro ESTRICTO cuando llega cursoId
      filter.curso = Number(cursoDoc.anio);
      filter.division = String(cursoDoc.division);
      usedCursoId = true;
    } else {
      // Búsqueda libre por curso/división
      const cursoFilter = buildCursoFilter(curso);
      if (cursoFilter) filter.curso = cursoFilter;

      const divisionFilter = buildFieldFilter(division);
      if (divisionFilter) filter.division = divisionFilter;
    }

    if (!filter.curso && !filter.division) {
      return res
        .status(400)
        .json({ error: "Debés indicar cursoId o curso/división" });
    }

    const docs = await Student.find(filter)
      .select("nombre curso division codigo")
      .sort({ nombre: 1 })
      .lean();

    return res.json(docs);
  } catch (error) {
    console.error("Error listando estudiantes por curso:", error);
    res.status(500).json({ error: "Error buscando estudiantes" });
  }
});

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
  }
);

export default router;
