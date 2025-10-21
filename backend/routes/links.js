// routes/links.js
import express from "express";
import crypto from "crypto";
import StudentLinkToken from "../models/StudentLinkToken.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

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
 * El padre pega el código y queda vinculado al estudiante
 * body: { code }
 */
router.post("/claim", requireAuth, requireRole("padre"), async (req, res) => {
  try {
    const { code } = req.body;

    const token = await StudentLinkToken.findOne({ code });
    if (!token) return res.status(400).json({ error: "Código inválido" });

    if (token.expiresAt && token.expiresAt < new Date()) {
      return res.status(400).json({ error: "Código vencido" });
    }
    if (token.uses >= (token.maxUses ?? 1)) {
      return res.status(400).json({ error: "Código agotado" });
    }

    // Vincular: agrega el estudiante al array 'hijos' del usuario padre (sin duplicar)
    await User.updateOne(
      { _id: req.user._id, rol: "padre" },
      { $addToSet: { hijos: token.studentId } } // $addToSet evita duplicados automáticamente
    );

    // Incrementa el contador de usos del código
    await StudentLinkToken.updateOne({ _id: token._id }, { $inc: { uses: 1 } });

    return res.json({ ok: true, studentId: token.studentId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al vincular" });
  }
});

export default router;
