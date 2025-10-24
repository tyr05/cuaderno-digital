// routes/users.js
import { Router } from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/users/:familiaId/agregar-hijo
 * body: { hijoId }
 * Solo admin: vincula un estudiante a una cuenta de familia
 */
router.put("/:familiaId/agregar-hijo", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { familiaId } = req.params;
    const { hijoId } = req.body;

    if (!hijoId) return res.status(400).json({ error: "Falta hijoId" });

    const familia = await User.findById(familiaId);
    const hijo = await User.findById(hijoId);

    if (!familia || !hijo) {
      return res.status(404).json({ error: "Cuenta de familia o estudiante no encontrada" });
    }
    if (familia.rol !== "familia") {
      return res.status(400).json({ error: "El usuario no tiene rol familia" });
    }
    if (hijo.rol !== "estudiante") {
      return res.status(400).json({ error: "Solo se pueden vincular usuarios con rol estudiante" });
    }

    await User.findByIdAndUpdate(familiaId, { $addToSet: { hijos: hijoId } });
    res.json({ msg: "Estudiante vinculado", familiaId, hijoId });
  } catch (err) {
    console.error("Error agregando hijo por admin:", err);
    res.status(500).json({ error: "No se pudo vincular el estudiante" });
  }
});

/**
 * GET /api/users/me/hijos
 * Rol: familia
 * Devuelve los estudiantes vinculados a la cuenta familiar autenticada
 */
router.get("/me/hijos", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const familia = await User.findById(req.user.uid).populate("hijos", "nombre email rol");
    if (!familia) {
      return res.status(404).json({ error: "Cuenta de familia no encontrada" });
    }

    const hijos = (familia.hijos || [])
      .filter((h) => h && h.rol === "estudiante")
      .map((h) => ({ id: h._id, nombre: h.nombre, email: h.email }));

    res.json(hijos);
  } catch (err) {
    console.error("Error obteniendo hijos (familia):", err);
    res.status(500).json({ error: "No se pudieron obtener los estudiantes vinculados" });
  }
});

/**
 * POST /api/users/me/hijos
 * Rol: familia
 * Vincula por email un estudiante a la cuenta familiar autenticada
 * body: { email }
 */
router.post("/me/hijos", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email del estudiante inválido" });
    }

    const familia = await User.findById(req.user.uid);
    if (!familia) {
      return res.status(404).json({ error: "Cuenta de familia no encontrada" });
    }

    const hijo = await User.findOne({ email });
    if (!hijo || hijo.rol !== "estudiante") {
      return res.status(404).json({ error: "No se encontró un estudiante con ese correo" });
    }

    const yaVinculado = (familia.hijos || []).some(
      (hijoId) => String(hijoId) === String(hijo._id)
    );
    if (yaVinculado) {
      return res.status(409).json({ error: "El estudiante ya está vinculado a tu cuenta" });
    }

    familia.hijos = [...(familia.hijos || []), hijo._id];
    await familia.save();

    res.status(201).json({
      msg: "Estudiante vinculado",
      hijo: { id: hijo._id, nombre: hijo.nombre, email: hijo.email },
    });
  } catch (err) {
    console.error("Error vinculando hijo (familia):", err);
    res.status(500).json({ error: "No se pudo vincular al estudiante" });
  }
});

export default router;
