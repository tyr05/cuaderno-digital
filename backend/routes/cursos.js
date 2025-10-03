import { Router } from "express";
import Curso from "../models/Curso.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Crear un curso (solo admin)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const curso = await Curso.create(req.body);
    res.status(201).json(curso);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar cursos (todos los roles)
router.get("/", requireAuth, async (req, res) => {
  const cursos = await Curso.find().populate("docentes alumnos", "nombre email rol");
  res.json(cursos);
});

// Agregar alumno a un curso (admin o docente)
router.post("/:id/agregar-alumno", requireAuth, requireRole("admin", "docente"), async (req, res) => {
  const { alumnoId } = req.body;
  const curso = await Curso.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { alumnos: alumnoId } },
    { new: true }
  ).populate("docentes alumnos", "nombre email rol");
  res.json(curso);
});

// Agregar docente a un curso (admin)
router.post("/:id/agregar-docente", requireAuth, requireRole("admin"), async (req, res) => {
  const { docenteId } = req.body;
  const curso = await Curso.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { docentes: docenteId } },
    { new: true }
  ).populate("docentes alumnos", "nombre email rol");
  res.json(curso);
});

export default router;
