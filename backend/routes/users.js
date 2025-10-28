// routes/users.js
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import AlumnoPadron from "../models/AlumnoPadron.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = Router();
const { ObjectId } = mongoose.Types;

/* -------------------------------------------------------------------------- */
/*                                Utilidades                                  */
/* -------------------------------------------------------------------------- */

function normStr(v, max = 120) {
  return (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "").slice(0, max);
}

function parseHijo(body, { parcial = false } = {}) {
  const nombre = normStr(body?.nombre);
  const curso = normStr(body?.curso, 40);
  const division = normStr(body?.division, 20);

  if (!parcial && !nombre) return { error: "El nombre del hijo es obligatorio" };

  const data = {};
  if (nombre) data.nombre = nombre;
  if (curso) data.curso = curso;
  if (division) data.division = division;

  if (!parcial && Object.keys(data).length === 0) {
    return { error: "Faltan datos del hijo" };
  }
  return { data };
}

/* -------------------------------------------------------------------------- */
/*                        Rutas de FAMILIA (autogestión)                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/users/me/hijos
 * Devuelve los hijos (subdocs) de la cuenta familia autenticada
 */
router.get("/me/hijos", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const familia = await User.findById(req.user.uid).select("hijos");
    if (!familia) return res.status(404).json({ error: "Cuenta de familia no encontrada" });
    res.json(familia.hijos || []);
  } catch (err) {
    console.error("Error obteniendo hijos:", err);
    res.status(500).json({ error: "No se pudieron obtener los estudiantes" });
  }
});

/**
 * POST /api/users/me/hijos/vincular
 * Vincula un hijo existente en el padrón oficial mediante código único
 * body: { codigo }
 */
router.post(
  "/me/hijos/vincular",
  requireAuth,
  requireRole("familia"),
  async (req, res) => {
    try {
      const codigo = normStr(req.body?.codigo, 80);
      if (!codigo) return res.status(400).json({ error: "El código es obligatorio" });

      const alumnoPadron = await AlumnoPadron.findOne({ codigo });
      if (!alumnoPadron) {
        return res.status(404).json({ error: "Código inválido" });
      }
      if (alumnoPadron.vinculado) {
        return res.status(409).json({ error: "Este estudiante ya está vinculado" });
      }

      const familia = await User.findById(req.user.uid).select("hijos");
      if (!familia) {
        return res.status(404).json({ error: "Cuenta de familia no encontrada" });
      }

      const hijo = {
        _id: new ObjectId(),
        nombre: alumnoPadron.nombre,
        curso: alumnoPadron.curso,
        division: alumnoPadron.division,
      };

      familia.hijos.push(hijo);
      await familia.save();

      alumnoPadron.vinculado = true;
      await alumnoPadron.save();

      res.status(201).json({ msg: "Vinculado correctamente", hijo });
    } catch (err) {
      console.error("Error vinculando hijo por código:", err);
      res.status(500).json({ error: "No se pudo vincular al estudiante" });
    }
  }
);

/**
 * POST /api/users/me/hijos
 * Crea un hijo (subdocumento) en la familia
 * body: { nombre, curso?, division? }
 */
router.post("/me/hijos", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const { data, error } = parseHijo(req.body);
    if (error) return res.status(400).json({ error });

    const familia = await User.findById(req.user.uid).select("hijos");
    if (!familia) return res.status(404).json({ error: "Cuenta de familia no encontrada" });

    const nuevo = { _id: new ObjectId(), ...data };
    familia.hijos.push(nuevo);
    await familia.save();

    res.status(201).json({ msg: "Hijo agregado", hijo: nuevo });
  } catch (err) {
    console.error("Error agregando hijo:", err);
    res.status(500).json({ error: "No se pudo agregar el hijo" });
  }
});

/**
 * PUT /api/users/me/hijos/:hijoId
 * Actualiza parcialmente un hijo propio
 * body: { nombre?, curso?, division? }
 */
router.put("/me/hijos/:hijoId", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const { hijoId } = req.params;
    if (!ObjectId.isValid(hijoId)) return res.status(400).json({ error: "hijoId inválido" });

    const { data, error } = parseHijo(req.body, { parcial: true });
    if (error) return res.status(400).json({ error });
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nada para actualizar" });

    const familia = await User.findById(req.user.uid).select("hijos");
    if (!familia) return res.status(404).json({ error: "Cuenta de familia no encontrada" });

    const hijo = familia.hijos.id(hijoId);
    if (!hijo) return res.status(404).json({ error: "Hijo no encontrado" });

    Object.assign(hijo, data);
    await familia.save();

    res.json({ msg: "Hijo actualizado", hijo });
  } catch (err) {
    console.error("Error actualizando hijo:", err);
    res.status(500).json({ error: "No se pudo actualizar el hijo" });
  }
});

/**
 * DELETE /api/users/me/hijos/:hijoId
 * Elimina un hijo propio
 */
router.delete("/me/hijos/:hijoId", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const { hijoId } = req.params;
    if (!ObjectId.isValid(hijoId)) return res.status(400).json({ error: "hijoId inválido" });

    const familia = await User.findById(req.user.uid).select("hijos");
    if (!familia) return res.status(404).json({ error: "Cuenta de familia no encontrada" });

    const before = familia.hijos.length;
    familia.hijos = familia.hijos.filter(h => String(h._id) !== String(hijoId));
    if (familia.hijos.length === before) {
      return res.status(404).json({ error: "Hijo no encontrado" });
    }

    await familia.save();
    res.json({ msg: "Hijo eliminado" });
  } catch (err) {
    console.error("Error eliminando hijo:", err);
    res.status(500).json({ error: "No se pudo eliminar el hijo" });
  }
});

/* -------------------------------------------------------------------------- */
/*                        Rutas de ADMIN (gestión externa)                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/users/:familiaId/hijos
 * Lista hijos de una familia
 */
router.get("/:familiaId/hijos", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { familiaId } = req.params;
    if (!ObjectId.isValid(familiaId)) return res.status(400).json({ error: "familiaId inválido" });

    const familia = await User.findById(familiaId).select("rol hijos");
    if (!familia) return res.status(404).json({ error: "Familia no encontrada" });
    if (familia.rol !== "familia") return res.status(400).json({ error: "El usuario destino no tiene rol familia" });

    res.json(familia.hijos || []);
  } catch (err) {
    console.error("Error listando hijos (admin):", err);
    res.status(500).json({ error: "No se pudieron listar los hijos" });
  }
});

/**
 * POST /api/users/:familiaId/hijos
 * Agrega un hijo a una familia
 * body: { nombre, curso?, division? }
 */
router.post("/:familiaId/hijos", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { familiaId } = req.params;
    if (!ObjectId.isValid(familiaId)) return res.status(400).json({ error: "familiaId inválido" });

    const { data, error } = parseHijo(req.body);
    if (error) return res.status(400).json({ error });

    const familia = await User.findById(familiaId).select("rol hijos");
    if (!familia) return res.status(404).json({ error: "Familia no encontrada" });
    if (familia.rol !== "familia") return res.status(400).json({ error: "El usuario destino no tiene rol familia" });

    const nuevo = { _id: new ObjectId(), ...data };
    familia.hijos.push(nuevo);
    await familia.save();

    res.status(201).json({ msg: "Hijo agregado", hijo: nuevo });
  } catch (err) {
    console.error("Error agregando hijo (admin):", err);
    res.status(500).json({ error: "No se pudo agregar el hijo" });
  }
});

/**
 * PUT /api/users/:familiaId/hijos/:hijoId
 * Actualiza datos de un hijo de una familia
 */
router.put("/:familiaId/hijos/:hijoId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { familiaId, hijoId } = req.params;
    if (!ObjectId.isValid(familiaId) || !ObjectId.isValid(hijoId)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const { data, error } = parseHijo(req.body, { parcial: true });
    if (error) return res.status(400).json({ error });
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nada para actualizar" });

    const familia = await User.findById(familiaId).select("rol hijos");
    if (!familia) return res.status(404).json({ error: "Familia no encontrada" });
    if (familia.rol !== "familia") return res.status(400).json({ error: "El usuario destino no tiene rol familia" });

    const hijo = familia.hijos.id(hijoId);
    if (!hijo) return res.status(404).json({ error: "Hijo no encontrado" });

    Object.assign(hijo, data);
    await familia.save();

    res.json({ msg: "Hijo actualizado", hijo });
  } catch (err) {
    console.error("Error actualizando hijo (admin):", err);
    res.status(500).json({ error: "No se pudo actualizar el hijo" });
  }
});

/**
 * DELETE /api/users/:familiaId/hijos/:hijoId
 * Elimina un hijo de una familia
 */
router.delete("/:familiaId/hijos/:hijoId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { familiaId, hijoId } = req.params;
    if (!ObjectId.isValid(familiaId) || !ObjectId.isValid(hijoId)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const familia = await User.findById(familiaId).select("rol hijos");
    if (!familia) return res.status(404).json({ error: "Familia no encontrada" });
    if (familia.rol !== "familia") return res.status(400).json({ error: "El usuario destino no tiene rol familia" });

    const before = familia.hijos.length;
    familia.hijos = familia.hijos.filter(h => String(h._id) !== String(hijoId));
    if (familia.hijos.length === before) {
      return res.status(404).json({ error: "Hijo no encontrado" });
    }

    await familia.save();
    res.json({ msg: "Hijo eliminado" });
  } catch (err) {
    console.error("Error eliminando hijo (admin):", err);
    res.status(500).json({ error: "No se pudo eliminar el hijo" });
  }
});

export default router;
