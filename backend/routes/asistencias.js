import { Router } from "express";
import mongoose from "mongoose";
import Asistencia from "../models/Asistencia.js";
import FamilyStudent from "../models/FamilyStudent.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

function handleCertificateUpload(req, res, next) {
  upload.single("certificado")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "El archivo supera el tamaño máximo permitido" });
    }
    return res.status(400).json({ error: err.message || "No se pudo procesar el archivo" });
  });
}

function todayStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function buildMatchFilter(req, { curso, fecha, alumno, desde, hasta }) {
  const match = {};

  if (curso) match.curso = curso;
  if (fecha) match.fecha = fecha;
  if (alumno) match.alumno = alumno;

  if (desde || hasta) {
    match.fecha = match.fecha || {};
    if (desde) match.fecha.$gte = desde;
    if (hasta) match.fecha.$lte = hasta;
  }

  if (req.user.rol === "familia") {
    const vinculaciones = await FamilyStudent.find({ familyId: req.user.uid })
      .select("studentId")
      .lean();
    const hijosRefs = vinculaciones
      .map((v) => v.studentId)
      .filter(Boolean)
      .map((id) => id.toString());

    if (match.alumno) {
      const target = String(match.alumno);
      if (!mongoose.Types.ObjectId.isValid(target)) {
        throw Object.assign(new Error("Identificador de alumno inválido"), { status: 400 });
      }
      const autorizado = hijosRefs.some((ref) => ref === target);
      if (!autorizado) {
        throw Object.assign(new Error("No autorizado para ver a este alumno"), { status: 403 });
      }
      match.alumno = new mongoose.Types.ObjectId(target);
    } else {
      if (hijosRefs.length === 0) {
        match.alumno = { $in: [] };
      } else {
        match.alumno = { $in: hijosRefs.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }
  }

  if (req.user.rol === "estudiante") {
    match.alumno = req.user.uid;
  }

  return match;
}

/**
 * POST /api/asistencias/marcar
 * (docente o admin) Carga en bloque para un curso y fecha.
 * body: { cursoId, fecha: "YYYY-MM-DD", lista: [{ alumnoId, estado }] }
 */
router.post("/marcar", requireAuth, requireRole("docente","admin"), async (req, res) => {
  const { cursoId, fecha, lista } = req.body;
  if (!cursoId || !fecha || !Array.isArray(lista)) {
    return res.status(400).json({ error: "cursoId, fecha y lista son obligatorios" });
  }

  const ops = lista.map(({ alumnoId, estado }) => ({
    updateOne: {
      filter: { curso: cursoId, alumno: alumnoId, fecha },
      update: { $set: { estado } },
      upsert: true
    }
  }));

  await Asistencia.bulkWrite(ops);
  const result = await Asistencia.find({ curso: cursoId, fecha })
    .populate("alumno","nombre email")
    .populate("curso","nombre anio division");
  res.json(result);
});

/**
 * GET /api/asistencias/resumen
 * Devuelve totales y porcentajes por estado, tardanzas y pendientes.
 * Query: curso, desde, hasta, ultimosDias
 */
router.get("/resumen", requireAuth, async (req, res) => {
  try {
    const { curso, desde, hasta, ultimosDias } = req.query;

    let range = { desde, hasta };
    if (!desde && ultimosDias) {
      const days = Math.max(parseInt(ultimosDias, 10) || 0, 0);
      if (days > 0) {
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        range.desde = todayStr(start);
      }
    }

    const match = await buildMatchFilter(req, {
      curso,
      desde: range.desde,
      hasta: range.hasta,
    });

    const [counts, pending, timeline] = await Promise.all([
      Asistencia.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$estado",
            total: { $sum: 1 },
          },
        },
      ]),
      Asistencia.aggregate([
        {
          $match: {
            ...match,
            "justificacion.archivoUrl": { $exists: true, $ne: null },
            "justificacion.aprobado": false,
          },
        },
        { $count: "total" },
      ]),
      Asistencia.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$fecha",
            total: { $sum: 1 },
            presentes: {
              $sum: {
                $cond: [{ $eq: ["$estado", "presente"] }, 1, 0],
              },
            },
            ausentes: {
              $sum: {
                $cond: [{ $eq: ["$estado", "ausente"] }, 1, 0],
              },
            },
            tardes: {
              $sum: {
                $cond: [{ $eq: ["$estado", "tarde"] }, 1, 0],
              },
            },
            justificados: {
              $sum: {
                $cond: [{ $eq: ["$estado", "justificado"] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totals = counts.reduce(
      (acc, curr) => {
        acc.total += curr.total;
        acc.byEstado[curr._id] = curr.total;
        return acc;
      },
      { total: 0, byEstado: {} }
    );

    const estados = ["presente", "ausente", "tarde", "justificado"]; // mantener orden
    const estadosDetalle = estados.reduce((acc, estado) => {
      const totalEstado = totals.byEstado[estado] || 0;
      const porcentaje = totals.total ? Math.round((totalEstado / totals.total) * 100) : 0;
      acc[estado] = { total: totalEstado, porcentaje };
      return acc;
    }, {});

    const timelineParsed = timeline.map((item) => {
      const { _id: fechaItem, total, presentes, ausentes, tardes, justificados } = item;
      return {
        fecha: fechaItem,
        total,
        presentes,
        ausentes,
        tardes,
        justificados,
        porcentajePresente: total ? Math.round((presentes / total) * 100) : 0,
      };
    });

    res.json({
      total: totals.total,
      estados: estadosDetalle,
      llegadasTarde: {
        total: estadosDetalle.tarde.total,
        porcentaje: estadosDetalle.tarde.porcentaje,
      },
      justificacionesPendientes: pending[0]?.total || 0,
      timeline: timelineParsed,
      periodo: {
        desde: range.desde || null,
        hasta: range.hasta || null,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Error al obtener resumen" });
  }
});

/**
 * GET /api/asistencias?curso=<id>&fecha=YYYY-MM-DD&alumno=<id>
 * Listado por curso/fecha (docente/admin) o por alumno (padre/estudiante con restricción).
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { curso, fecha, alumno } = req.query;
    const filtro = await buildMatchFilter(req, { curso, fecha, alumno });

    const data = await Asistencia.find(filtro)
      .sort({ fecha: -1 })
      .populate("alumno","nombre email")
      .populate("curso","nombre anio division");
    res.json(data);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Error al listar asistencias" });
  }
});

/**
 * POST /api/asistencias/:id/justificar
 * (familia o admin) Sube certificado y deja pendiente de aprobación.
 * form-data: fields { motivo }, file "certificado"
 */
router.post("/:id/justificar", requireAuth, requireRole("familia","admin"), handleCertificateUpload, async (req,res) => {
  const { id } = req.params;
  const a = await Asistencia.findById(id);
  if (!a) return res.status(404).json({ error: "Asistencia no encontrada" });

  // La familia solo puede justificar si el alumno está vinculado
  if (req.user.rol === "familia") {
    const vinculaciones = await FamilyStudent.find({ familyId: req.user.uid })
      .select("studentId")
      .lean();
    const hijos = new Set(
      vinculaciones
        .map((v) => v.studentId)
        .filter(Boolean)
        .map((id) => id.toString()),
    );
    if (!hijos.has(String(a.alumno))) {
      return res.status(403).json({ error: "No autorizado para justificar este alumno" });
    }
  }

  if (!req.file) return res.status(400).json({ error: "Falta archivo 'certificado'" });

  a.justificacion = {
    motivo: req.body.motivo || "",
    archivoUrl: `/uploads/${req.file.filename}`,
    cargadoPor: req.user.uid,
    fechaCarga: new Date(),
    aprobado: false
  };
  // Mantener estado "ausente" hasta aprobar. (Docente puede aprobar abajo)
  await a.save();
  res.json({ msg: "Justificación cargada", asistencia: a });
});

/**
 * POST /api/asistencias/:id/aprobar
 * (docente o admin) Marca justificación como aprobada y estado "justificado".
 */
router.post("/:id/aprobar", requireAuth, requireRole("docente","admin"), async (req,res) => {
  const { id } = req.params;
  const a = await Asistencia.findById(id);
  if (!a) return res.status(404).json({ error: "Asistencia no encontrada" });
  if (!a.justificacion?.archivoUrl) return res.status(400).json({ error: "No hay justificación cargada" });

  a.justificacion.aprobado = true;
  a.justificacion.revisadoPor = req.user.uid;
  a.estado = "justificado";
  await a.save();
  res.json({ msg: "Justificación aprobada", asistencia: a });
});

export default router;
