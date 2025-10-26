// routes/anuncios.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import Anuncio from "../models/anuncio.js";
import Curso from "../models/Curso.js";
import AnuncioRecibo from "../models/AnuncioRecibo.js";
import Student from "../models/Student.js";

function normalize(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}

const router = Router();

// Roles/Audiencias oficiales
const FAMILY_ROLES = ["familia"];
const FAMILY_AUDIENCES = ["todos", "familia"];

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

    const cursoDoc = await Curso.findById(curso).select("anio division nombre");
    if (!cursoDoc) return res.status(404).json({ error: "Curso no encontrado" });

    const alumnoId = typeof alumno === "string" ? alumno.trim() : undefined;
    if (alumnoId) {
      const alumnoDoc = await Student.findById(alumnoId).select("curso division nombre");
      if (!alumnoDoc) {
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }

      const cursoValor = normalize(cursoDoc.anio ?? cursoDoc.nombre);
      const alumnoCursoValor = normalize(alumnoDoc.curso);
      if (!cursoValor || cursoValor !== alumnoCursoValor) {
        return res.status(400).json({ error: "El estudiante no pertenece al curso seleccionado" });
      }

      const divisionCursoValor = normalize(cursoDoc.division);
      const divisionAlumnoValor = normalize(alumnoDoc.division);
      if (divisionCursoValor && divisionCursoValor !== divisionAlumnoValor) {
        return res.status(400).json({ error: "El estudiante no pertenece a la división del curso" });
      }
    }

    const anuncio = await Anuncio.create({
      titulo,
      contenido,
      curso,
      visiblePara: (visiblePara || "todos").toLowerCase(), // normalizado
      autor: req.user.uid,
      alumno: alumnoId || undefined,
    });

    res.status(201).json(anuncio);
  } catch (e) {
    console.error("Error al crear anuncio:", e);
    res.status(500).json({ error: "Error al crear anuncio" });
  }
});

/**
 * Inicializar recibos “notified” al ingresar (familia)
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
    console.error("No se pudo inicializar notificaciones:", e);
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
    console.error("No se pudo contar no leídos:", e);
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
    console.error("No se pudo marcar como leído:", e);
    res.status(500).json({ error: "No se pudo marcar como leído" });
  }
});

/**
 * Listar anuncios por curso / alumno
 * GET /api/anuncios?curso=<cursoId>&alumno=<alumnoId>[,alumnoId2...]
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { curso, alumno } = req.query;
    const filtro = {};
    if (curso) filtro.curso = curso;

    const rol = (req.user?.rol || "").toLowerCase();

    // Permite múltiples alumnos separados por coma
    const alumnoIds = typeof alumno === "string" && alumno.trim()
      ? alumno.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (alumnoIds.length) {
      filtro.$or = [{ alumno: null }, { alumno: { $in: alumnoIds } }];
    } else if (rol === "familia") {
      // Familia ve anuncios generales para familia/todos
      filtro.$or = [{ alumno: null, visiblePara: { $in: FAMILY_AUDIENCES } }];
    } else if (rol === "docente" || rol === "admin") {
      // Docente/Admin ven todo (o limitá por curso si querés)
    } else {
      // Cualquier otro rol (si existiera) → por ahora, nada
      filtro._id = { $exists: false };
    }

    const anuncios = await Anuncio.find(filtro)
      .sort({ createdAt: -1 })
      .populate("autor", "nombre rol")
      .populate("curso", "nombre anio division turno")
      .populate("alumno", "nombre curso division codigo");

    res.json(anuncios);
  } catch (e) {
    console.error("Error al listar anuncios:", e);
    res.status(500).json({ error: "Error al listar anuncios" });
  }
});

export default router;
