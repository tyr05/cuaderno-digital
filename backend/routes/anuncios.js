import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Anuncio from "../models/anuncio.js";
import Curso from "../models/Curso.js";

const router = Router();

/**
 * Crear anuncio (docente o admin)
 * body: { titulo, contenido, curso, visiblePara, alumno? }
 */
router.post("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { titulo, contenido, curso, visiblePara, alumno } = req.body;

    if (!titulo || !contenido || !curso) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const cursoDoc = await Curso.findById(curso).select("alumnos");
    if (!cursoDoc) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const alumnoId = typeof alumno === "string" ? alumno.trim() : undefined;
    if (alumnoId) {
      const pertenece = cursoDoc.alumnos.some((id) => id.equals(alumnoId));
      if (!pertenece) {
        return res.status(400).json({ error: "El estudiante no pertenece al curso" });
      }
    }

    const anuncio = await Anuncio.create({
      titulo,
      contenido,
      curso,
      visiblePara: visiblePara || "todos",
      autor: req.user.uid,
      alumno: alumnoId || undefined,
    });

    res.status(201).json(anuncio);
  } catch (e) {
    res.status(500).json({ error: "Error al crear anuncio" });
  }
});

/**
 * Listar anuncios por curso (cualquier usuario autenticado).
 * GET /api/anuncios?curso=<cursoId>
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { curso, alumno } = req.query;
    const filtro = {};
    if (curso) filtro.curso = curso;

    const alumnoId = typeof alumno === "string" ? alumno.trim() : "";

    if (alumnoId) {
      filtro.$or = [{ alumno: null }, { alumno: alumnoId }];
    } else if (req.user?.rol === "estudiante") {
      filtro.$or = [
        { alumno: null, visiblePara: { $in: ["todos", "estudiantes"] } },
        { alumno: req.user.uid },
      ];
    } else if (req.user?.rol === "padre") {
      filtro.$or = [
        { alumno: null, visiblePara: { $in: ["todos", "padres"] } },
      ];
    }

    const anuncios = await Anuncio.find(filtro)
      .sort({ createdAt: -1 })
      .populate("autor", "nombre rol")
      .populate("curso", "nombre anio division turno")
      .populate("alumno", "nombre email rol");

    res.json(anuncios);
  } catch (e) {
    res.status(500).json({ error: "Error al listar anuncios" });
  }
});

export default router;
