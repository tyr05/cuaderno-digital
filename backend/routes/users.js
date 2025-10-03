import { Router } from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

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

export default router;
