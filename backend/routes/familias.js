import express from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";
import FamilyStudent from "../models/FamilyStudent.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const CODE_REGEX = /^[A-Z]{3}-\d{2}-\d{3}$/;

function normalizeCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

router.use(requireAuth, requireRole("familia"));

router.post("/vinculos", async (req, res) => {
  const familyId = req.user.uid;
  const codigo = normalizeCode(req.body?.codigo);
  console.debug(`[familias] POST /vinculos familia=${familyId} codigo=${codigo}`);

  if (!codigo) {
    return res.status(400).json({ error: "El código es obligatorio" });
  }
  if (!CODE_REGEX.test(codigo)) {
    return res.status(400).json({ error: "Formato de código inválido" });
  }

  try {
    const student = await Student.findOne({ codigo });
    if (!student) {
      console.debug(`[familias] código no encontrado`);
      return res.status(404).json({ error: "El código no corresponde a ningún estudiante" });
    }

    const existingForFamily = await FamilyStudent.findOne({ familyId, studentId: student._id });
    if (existingForFamily) {
      return res.status(409).json({ error: "Este estudiante ya está vinculado a tu cuenta" });
    }

    const linkedElsewhere = await FamilyStudent.findOne({ studentId: student._id });
    if (linkedElsewhere) {
      return res.status(409).json({ error: "El código ya fue utilizado por otra familia" });
    }

    const vinculo = await FamilyStudent.create({ familyId, studentId: student._id });
    if (!student.codigoUsado) {
      student.codigoUsado = true;
      await student.save();
    }

    return res.status(201).json({
      ok: true,
      message: "Estudiante vinculado",
      vinculo: {
        id: vinculo._id,
        familyId: vinculo.familyId,
        studentId: vinculo.studentId,
        createdAt: vinculo.createdAt,
      },
      student: {
        id: student._id,
        nombre: student.nombre,
        curso: student.curso,
        division: student.division,
        codigo: student.codigo,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "El código ya fue utilizado" });
    }
    console.error("Error creando vínculo familia-estudiante", error);
    return res.status(500).json({ error: "No se pudo crear el vínculo" });
  }
});

router.get("/mis-hijos", async (req, res) => {
  const familyId = req.user.uid;
  console.debug(`[familias] GET /mis-hijos familia=${familyId}`);

  try {
    const vinculaciones = await FamilyStudent.find({ familyId })
      .populate({ path: "studentId", select: "nombre curso division codigo" })
      .sort({ createdAt: 1 })
      .lean();

    const hijos = vinculaciones
      .map((v) => {
        if (!v.studentId) return null;
        const student = v.studentId;
        return {
          studentId: String(student._id),
          vinculoId: String(v._id),
          nombre: student.nombre,
          curso: student.curso,
          division: student.division,
          codigo: student.codigo,
          linkedAt: v.createdAt,
        };
      })
      .filter(Boolean);

    return res.json({ ok: true, hijos });
  } catch (error) {
    console.error("Error listando hijos vinculados", error);
    return res.status(500).json({ error: "No se pudieron obtener los estudiantes vinculados" });
  }
});

router.delete("/vinculos/:studentId", async (req, res) => {
  const familyId = req.user.uid;
  const { studentId } = req.params;
  console.debug(`[familias] DELETE /vinculos/${studentId} familia=${familyId}`);

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ error: "Identificador de estudiante inválido" });
  }

  try {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const vinculo = await FamilyStudent.findOneAndDelete({ familyId, studentId: studentObjectId });
    if (!vinculo) {
      return res.status(404).json({ error: "Vínculo no encontrado" });
    }

    const stillLinked = await FamilyStudent.exists({ studentId: studentObjectId });
    if (!stillLinked) {
      await Student.updateOne({ _id: studentObjectId }, { $set: { codigoUsado: false } });
    }

    return res.json({ ok: true, message: "Vínculo eliminado" });
  } catch (error) {
    console.error("Error eliminando vínculo", error);
    return res.status(500).json({ error: "No se pudo eliminar el vínculo" });
  }
});

export default router;
