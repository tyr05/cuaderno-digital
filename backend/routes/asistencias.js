import { Router } from "express";
import Asistencia from "../models/Asistencia.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

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
 * GET /api/asistencias?curso=<id>&fecha=YYYY-MM-DD&alumno=<id>
 * Listado por curso/fecha (docente/admin) o por alumno (padre/estudiante con restricción).
 */
router.get("/", requireAuth, async (req, res) => {
  const { curso, fecha, alumno } = req.query;
  const filtro = {};

  if (curso) filtro.curso = curso;
  if (fecha) filtro.fecha = fecha;
  if (alumno) filtro.alumno = alumno;

  // Restricción por rol:
  if (req.user.rol === "padre") {
    const padre = await User.findById(req.user.uid);
    const hijos = (padre?.hijos || []).map(String);
    if (alumno) {
      if (!hijos.includes(String(alumno))) {
        return res.status(403).json({ error: "No autorizado para ver a este alumno" });
      }
    } else {
      // si no pide alumno, devolvemos solo asistencias de sus hijos
      filtro.alumno = { $in: hijos };
    }
  }
  if (req.user.rol === "estudiante") {
    // estudiante solo ve sus propias asistencias
    filtro.alumno = req.user.uid;
  }

  const data = await Asistencia.find(filtro)
    .sort({ fecha: -1 })
    .populate("alumno","nombre email")
    .populate("curso","nombre anio division");
  res.json(data);
});

/**
 * POST /api/asistencias/:id/justificar
 * (padre o admin) Sube certificado y deja pendiente de aprobación.
 * form-data: fields { motivo }, file "certificado"
 */
router.post("/:id/justificar", requireAuth, requireRole("padre","admin"), upload.single("certificado"), async (req,res) => {
  const { id } = req.params;
  const a = await Asistencia.findById(id);
  if (!a) return res.status(404).json({ error: "Asistencia no encontrada" });

  // Padre solo puede justificar si el alumno es su hijo
  if (req.user.rol === "padre") {
    const padre = await User.findById(req.user.uid);
    const hijos = (padre?.hijos || []).map(String);
    if (!hijos.includes(String(a.alumno))) {
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
