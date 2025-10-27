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
  normalizeCursoForCompare,
  normalizeForCompare,
  studentMatchesCurso,
} from "../utils/studentFilters.js";

const router = express.Router();

function combineStudentFilters({
  cursoFilter,
  cursoComparableFilter,
  divisionFilter,
  divisionComparableFilter,
}) {
  const clauses = [];

  if (cursoFilter || cursoComparableFilter) {
    const or = [];
    if (cursoFilter) or.push({ curso: cursoFilter });
    if (cursoComparableFilter) or.push({ cursoComparable: cursoComparableFilter });
    if (or.length === 1) clauses.push(or[0]);
    else if (or.length > 1) clauses.push({ $or: or });
  }

  if (divisionFilter || divisionComparableFilter) {
    const or = [];
    if (divisionFilter) or.push({ division: divisionFilter });
    if (divisionComparableFilter) or.push({ divisionComparable: divisionComparableFilter });
    if (or.length === 1) clauses.push(or[0]);
    else if (or.length > 1) clauses.push({ $or: or });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

async function findAndMatchStudents(filter, cursoDoc) {
  const query = Object.keys(filter || {}).length ? filter : {};

  const students = await Student.find(query)
    .select("nombre curso division codigo cursoComparable divisionComparable")
    .sort({ nombre: 1 })
    .lean();

  if (!cursoDoc) return students;

  return students.filter((student) => studentMatchesCurso(student, cursoDoc));
}

router.get("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { cursoId, curso, division } = req.query;

    let cursoDoc = null;
    let cursoFilter;
    let divisionFilter;
    let cursoComparableFilter;
    let divisionComparableFilter;

    if (cursoId) {
      cursoDoc = await Curso.findById(cursoId)
        .select("anio division nombre")
        .lean();
      if (!cursoDoc) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      cursoFilter = buildCursoFilter(cursoDoc.anio, cursoDoc.nombre);
      divisionFilter = buildFieldFilter(cursoDoc.division);
      cursoComparableFilter = buildCursoComparableFilter(cursoDoc.anio, cursoDoc.nombre);
      divisionComparableFilter = buildDivisionComparableFilter(cursoDoc.division);
    } else {
      cursoFilter = buildCursoFilter(curso);
      divisionFilter = buildFieldFilter(division);
      cursoComparableFilter = buildCursoComparableFilter(curso);
      divisionComparableFilter = buildDivisionComparableFilter(division);
    }

    if (!cursoFilter && !cursoComparableFilter && !divisionFilter && !divisionComparableFilter) {
      return res.status(400).json({ error: "Debés indicar cursoId o curso/división" });
    }

    const primaryFilter = combineStudentFilters({
      cursoFilter,
      cursoComparableFilter,
      divisionFilter,
      divisionComparableFilter,
    });

    const logContext = {
      cursoId: cursoId || null,
      curso: curso ?? null,
      division: division ?? null,
    };

    let students = await findAndMatchStudents(primaryFilter, cursoDoc);

    if (cursoDoc && students.length === 0) {
      console.info(
        "[students] Sin alumnos con filtro principal, iniciando fallback",
        logContext,
      );

      const fallbacks = [
        {
          label: "curso",
          filter: combineStudentFilters({ cursoFilter, cursoComparableFilter }),
        },
        {
          label: "division",
          filter: combineStudentFilters({ divisionFilter, divisionComparableFilter }),
        },
        {
          label: "sin filtros",
          filter: {},
        },
      ];

      for (const fallback of fallbacks) {
        if (students.length > 0) break;
        students = await findAndMatchStudents(fallback.filter, cursoDoc);
        if (students.length > 0) {
          console.info(
            `[students] Fallback "${fallback.label}" recuperó ${students.length} alumno(s)`,
            logContext,
          );
          break;
        }
      }
    }

    if (students.length === 0 && cursoDoc) {
      const cursoConIntegrantes = await Curso.findById(cursoDoc._id)
        .select("anio division nombre alumnos")
        .populate("alumnos", "nombre email rol")
        .lean();

      const integrantes = Array.isArray(cursoConIntegrantes?.alumnos)
        ? cursoConIntegrantes.alumnos.filter(Boolean)
        : [];

      if (integrantes.length > 0) {
        console.info(
          "[students] Fallback usando alumnos vinculados al curso",
          logContext,
        );

        const cursoValor =
          cursoConIntegrantes?.anio ?? cursoConIntegrantes?.nombre ?? "";
        const divisionValor = cursoConIntegrantes?.division ?? "";
        const cursoComparableValor = normalizeCursoForCompare(cursoValor);
        const divisionComparableValor = normalizeForCompare(divisionValor);

        students = integrantes.map((alumno) => ({
          _id: alumno._id,
          nombre: alumno.nombre || alumno.email || "",
          email: alumno.email || "",
          curso: cursoValor,
          division: divisionValor,
          cursoComparable: cursoComparableValor || undefined,
          divisionComparable: divisionComparableValor || undefined,
        }));
      }
    }

    if (students.length === 0) {
      console.warn("[students] No se encontraron alumnos con los criterios proporcionados", logContext);
    }

    res.json(students);
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
  }
);

export default router;
