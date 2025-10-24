// routes/students.js
import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

// GET /api/students/search?q=mar&curso=1&division=1&limit=20
router.get("/search", async (req, res) => {
  const { q = "", curso, division, limit = 20 } = req.query;

  // Construir filtro
  const filter = {};
  if (q) filter.nombre = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (curso) filter.curso = Number(curso);
  if (division) filter.division = isNaN(division) ? division : Number(division);

  const docs = await Student.find(filter)
    .select("nombre curso division")
    .limit(Math.min(Number(limit) || 20, 50))
    .lean();

  res.json(docs);
});

export default router;
