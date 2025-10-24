// routes/links.js
import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import StudentLinkToken from "../models/StudentLinkToken.js";
import User from "../models/User.js";
import Curso from "../models/Curso.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const { ObjectId } = mongoose.Types;

/**
 * POST /api/links/generate
 * Crea un código para un estudiante (lo usa admin/docente)
 * body: { studentId, maxUses = 1, days = 7 }
 */
router.post("/generate", requireAuth, requireRole("docente", "admin"), async (req, res) => {
  try {
    const { studentId, maxUses = 1, days = 7 } = req.body;

    // Verifica que sea un User con rol "estudiante"
    const student = await User.findById(studentId).select("rol nombre");
    if (!student || student.rol !== "estudiante") {
      return res.status(400).json({ error: "studentId inválido: debe ser un usuario con rol 'estudiante'." });
    }

    // Código aleatorio legible (10 caracteres)
    const code = crypto.randomBytes(8).toString("base64url").slice(0, 10).toUpperCase();

    // Expiración: 'days' días desde hoy
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const token = await StudentLinkToken.create({ studentId, code, expiresAt, maxUses });

    // FRONTEND_BASE_URL: poné tu Firebase Hosting en .env de Render
    const base = (process.env.FRONTEND_BASE_URL || "https://tu-frontend.web.app").replace(/\/$/, "");
    const link = `${base}/vincular?code=${encodeURIComponent(code)}`;

    // Texto listo para compartir
    const msg = `Código de vinculación para ${student.nombre ?? "el estudiante"}: ${code}\n` +
                `Enlace directo: ${link}\n` +
                `Vence: ${expiresAt.toLocaleDateString()}`;

    return res.json({
      code,
      expiresAt,
      maxUses,
      link,
      whatsappLink: `https://wa.me/?text=${encodeURIComponent(msg)}`,
      mailtoLink:   `mailto:?subject=Código de vinculación&body=${encodeURIComponent(msg)}`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error generando código" });
  }
});

/**
 * POST /api/links/claim
 * La familia ingresa el código y queda vinculada al estudiante
 * body: { code }
 */
router.post("/claim", requireAuth, requireRole("familia"), async (req, res) => {
  try {
    const raw = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const code = raw.toUpperCase();
    if (!code) return res.status(400).json({ error: "Falta el código de vinculación" });

    const token = await StudentLinkToken.findOne({ code });
    if (!token) return res.status(400).json({ error: "Código inválido" });

    if (token.expiresAt && token.expiresAt < new Date()) {
      return res.status(400).json({ error: "Código vencido" });
    }
    if (token.uses >= (token.maxUses ?? 1)) {
      return res.status(400).json({ error: "Código agotado" });
    }

    const [familia, student] = await Promise.all([
      User.findById(req.user.uid).select("rol hijos"),
      User.findById(token.studentId).select("rol nombre"),
    ]);

    if (!familia || familia.rol !== "familia") {
      return res.status(403).json({ error: "La cuenta autenticada no es una familia válida" });
    }
    if (!student || student.rol !== "estudiante") {
      return res.status(400).json({ error: "El estudiante vinculado al código ya no está disponible" });
    }

    const yaVinculado = (familia.hijos || []).some(
      (hijo) => hijo.studentRef && hijo.studentRef.equals(student._id)
    );
    if (yaVinculado) {
      return res.status(409).json({ error: "Este estudiante ya está vinculado a tu cuenta" });
    }

    const curso = await Curso.findOne({ alumnos: student._id }).select("anio division turno nombre");
    let cursoLabel = "";
    if (curso) {
      const partes = [];
      if (typeof curso.anio === "number") {
        partes.push(`${curso.anio}°`);
      }
      if (curso.division) partes.push(curso.division);
      cursoLabel = partes.join(" ") || curso.nombre || "";
    }
    const divisionLabel = curso?.turno || "";

    const hijo = {
      _id: new ObjectId(),
      nombre: student.nombre,
      curso: cursoLabel || undefined,
      division: divisionLabel || undefined,
      studentRef: student._id,
    };

    familia.hijos.push(hijo);
    await familia.save();

    token.uses += 1;
    await token.save();

    return res.json({ msg: "Estudiante vinculado", hijo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al vincular" });
  }
});

export default router;
