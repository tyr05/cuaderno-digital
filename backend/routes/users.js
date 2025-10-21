import { Router } from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/users/:padreId/agregar-hijo
 * body: { hijoId }
 * Solo admin
 */
router.put("/:padreId/agregar-hijo", requireAuth, requireRole("admin"), async (req, res) => {
  const { padreId } = req.params;
  const { hijoId } = req.body;

  const padre = await User.findById(padreId);
  const hijo  = await User.findById(hijoId);

  if (!padre || !hijo) return res.status(404).json({ error: "Padre o hijo no encontrado" });
  if (padre.rol !== "padre") return res.status(400).json({ error: "El usuario no tiene rol padre" });
  if (hijo.rol !== "estudiante") return res.status(400).json({ error: "El hijo debe tener rol estudiante" });

  await User.findByIdAndUpdate(padreId, { $addToSet: { hijos: hijoId } });
  res.json({ msg: "Hijo vinculado", padreId, hijoId });
});

router.get("/me/hijos", requireAuth, requireRole("padre"), async (req, res) => {
  try {
    const padre = await User.findById(req.user.uid).populate("hijos", "nombre email rol");
    if (!padre) {
      return res.status(404).json({ error: "Padre no encontrado" });
    }

    const hijos = (padre.hijos || [])
      .filter((hijo) => hijo && hijo.rol === "estudiante")
      .map((hijo) => ({ id: hijo._id, nombre: hijo.nombre, email: hijo.email }));

    res.json(hijos);
  } catch (error) {
    console.error("Error obteniendo hijos del padre", error);
    res.status(500).json({ error: "No se pudieron obtener los estudiantes vinculados" });
  }
});

router.post("/me/hijos", requireAuth, requireRole("padre"), async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email del estudiante inválido" });
    }

    const padre = await User.findById(req.user.uid);
    if (!padre) {
      return res.status(404).json({ error: "Padre no encontrado" });
    }

    const hijo = await User.findOne({ email });
    if (!hijo || hijo.rol !== "estudiante") {
      return res.status(404).json({ error: "No se encontró un estudiante con ese correo" });
    }

    const yaVinculado = (padre.hijos || []).some((hijoId) => String(hijoId) === String(hijo._id));
    if (yaVinculado) {
      return res.status(409).json({ error: "El estudiante ya está vinculado a tu cuenta" });
    }

    padre.hijos = [...(padre.hijos || []), hijo._id];
    await padre.save();

    res.status(201).json({
      msg: "Estudiante vinculado",
      hijo: { id: hijo._id, nombre: hijo.nombre, email: hijo.email },
    });
  } catch (error) {
    console.error("Error vinculando hijo", error);
    res.status(500).json({ error: "No se pudo vincular al estudiante" });
  }
});

export default router;
