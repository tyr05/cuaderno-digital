// routes/anuncios.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Anuncio from "../models/anuncio.js";
import Curso from "../models/Curso.js";
import AnuncioRecibo from "../models/AnuncioRecibo.js";

const router = Router();

// Helpers de audiencia
const FAMILY_ROLES = ["familia", "tutor", "padre"];
const FAMILY_AUDIENCES = ["todos", "familia", "padres"]; // "padres" por compat durante la migración

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
    if (!cursoDoc) return res.status(404).json({ error: "Curso no encontrado" });

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
      // audiencia por defecto
      visiblePara: visiblePara || "todos",
      autor: req.user.uid,
      alumno: alumnoId || undefined,
    });

    res.status(201).json(anuncio);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear anuncio" });
  }
});

/**
 * Generar recibos "notified" al ingresar (familia/tutor/padre)
 * POST /api/anuncios/notify-on-login
 */
router.post("/notify-on-login", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const rol = (req.user?.rol || "").toLowerCase();

    const filtroFamilia = FAMILY_ROLES.includes(rol)
      ? { alumno: null, visiblePara: { $in: FAMILY_AUDIENCES } }
      : {};

    const anuncios = await Anuncio.find(filtroFamilia).select("_id");
    if (!anuncios.length) return res.json({ ok: true, created: 0 });

    const ops = anuncios.map((a) => ({
      updateOne: {
        filter: { usuario: uid, anuncio: a._id },
        update: {
          $setOnInsert: {
            usuario: uid,
            anuncio: a._id,
            estado: "notified",
            notifiedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const bulk = await AnuncioRecibo.bulkWrite(ops);
    res.json({ ok: true, created: bulk.nUpserted || ops.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo inicializar notificaciones" });
  }
});

/**
 * Contador de no leídos (badge)
 * GET /api/anuncios/count/unread
 */
router.get("/count/unread", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const rol = (req.user?.rol || "").toLowerCase();

    const filtroFamilia = FAMILY_ROLES.includes(rol)
      ? { alumno: null, visiblePara: { $in: FAMILY_AUDIENCES } }
      : {};

    const anns = await Anuncio.find(filtroFamilia).select("_id");
    const ids = anns.map((a) => a._id);
    if (!ids.length) return res.json({ unread: 0 });

    const leidos = await AnuncioRecibo.find({
      usuario: uid,
      anuncio: { $in: ids },
      estado: "read",
    }).select("anuncio");

    const readSet = new Set(leidos.map((r) => String(r.anuncio)));
    const unread = ids.filter((id) => !readSet.has(String(id))).length;

    res.json({ unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo contar no leídos" });
  }
});

/**
 * Marcar un anuncio como leído
 * POST /api/anuncios/ack/:id
 */
router.post("/ack/:id", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    await AnuncioRecibo.updateOne(
      { usuario: uid, anuncio: id },
      { $set: { estado: "read", readAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo marcar como leído" });
  }
});

/**
 * Listar anuncios por curso / alumno
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
    // 2) Según rol del usuario (si no se pidió alumno puntual)
    else if (rol === "estudiante") {
      filtro.$or = [
        { alumno: null, visiblePara: { $in: ["todos", "estudiantes"] } },
        { alumno: req.user.uid },
      ];
    } else if (FAMILY_ROLES.includes(rol)) {
      filtro.$or = [{ alumno: null, visiblePara: { $in: ["todos", "familia"] } }];
      // si todavía tenés anuncios viejos con "padres", podés dejar:
      // filtro.$or = [{ alumno: null, visiblePara: { $in: ["todos", "familia", "padres"] } }];
    } else {
      // Docente/Admin u otros roles: pueden ver todos (o limitar por curso si querés)
      // Dejamos filtro tal cual.
    }

    const anuncios = await Anuncio.find(filtro)
      .sort({ createdAt: -1 })
      .populate("autor", "nombre rol")
      .populate("curso", "nombre anio division turno")
      .populate("alumno", "nombre email rol");

    res.json(anuncios);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar anuncios" });
  }
});

export default router;
