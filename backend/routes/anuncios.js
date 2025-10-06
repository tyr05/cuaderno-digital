import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Anuncio from "../models/anuncio.js";

const router = Router();

/**
 * Crear anuncio (docente o admin)
 * body: { titulo, contenido, curso, visiblePara }
 */
router.post("/", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { titulo, contenido, curso, visiblePara } = req.body;

    if (!titulo || !contenido || !curso) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const anuncio = await Anuncio.create({
      titulo,
      contenido,
      curso,
      visiblePara: visiblePara || "todos",
      autor: req.user.uid
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
    const { curso } = req.query;
    const filtro = curso ? { curso } : {};
    const anuncios = await Anuncio.find(filtro)
      .sort({ createdAt: -1 })
      .populate("autor", "nombre rol")
      .populate("curso", "nombre anio division turno");

    res.json(anuncios);
  } catch (e) {
    res.status(500).json({ error: "Error al listar anuncios" });
  }
});

export default router;
