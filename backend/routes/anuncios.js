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
      // AUDIENCIA OFICIAL: "familia" 
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
 * GET /api/anuncios?curso=<cursoId>&alumno=<alumnoId>
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { curso, alumno } = req.query;
    const filtro = {};
    if (curso) filtro.curso = curso;

    const rol = (req.user?.rol || "").toLowerCase();
    const alumnoId = typeof alumno === "string" ? alumno.trim() : "";

    // 1) Si piden anuncios dirigidos a un alumno puntual
    if (alumnoId) {
      filtro.$or = [{ alumno: null }, { alumno: alumnoId }];
    }
    // 2) Según rol del usuario (solo si no se pidió alumno puntual)
    else if (rol === "estudiante") {
      filtro.$or = [
        { alumno: null, visiblePara: { $in: ["todos", "estudiantes"] } },
        { alumno: req.user.uid },
      ];
    } else if (rol === "familia" || rol === "tutor") {
      // Audiencia inclusiva oficial:
      filtro.$or = [
        { alumno: null, visiblePara: { $in: ["todos", "familia"] } },
      ];
      // (Opcional) Compatibilidad con anuncios viejos creados como "padres":
      // filtro.$or = [
      //   { alumno: null, visiblePara: { $in: ["todos", "familia", "padres"] } },
      // ];
    } else {
      // Docente/Admin u otros roles: si viene curso, ven los del curso; si no, todos
      // (Podés ajustar esto a tu política)
      // Sin $or => ven todos los anuncios (o limitá por curso si querés)
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
