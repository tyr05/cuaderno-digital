import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import Student from "../models/Student.js";
import Curso from "../models/Curso.js";

const router = express.Router();

/**
 * GET /api/students
 * Lista todos los estudiantes
 */
router.get(
  "/",
  requireAuth,
  requireRole("docente", "admin"),
  async (req, res) => {
    try {
      const students = await Student.find().sort({ nombre: 1 }).lean();
      res.json(students);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al obtener estudiantes" });
    }
  }
);

/**
 * GET /api/students/by-course/:id
 * Devuelve los estudiantes de un curso, usando el _id del curso.
 */
router.get(
  "/by-course/:id",
  requireAuth,
  requireRole("docente", "admin"),
  async (req, res) => {
    try {
      const curso = await Curso.findById(req.params.id);
      if (!curso) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const students = await Student.find({
        curso: curso.anio,
        division: curso.division
      })
        .sort({ nombre: 1 })
        .lean();

      res.json(students);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al obtener estudiantes" });
    }
  }
);

export default router;
