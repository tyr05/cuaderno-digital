import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await User.findOne({ email });
    if (existe) return res.status(409).json({ error: "El email ya está registrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      nombre,
      email,
      passwordHash,
      rol: "padre"
    });

    res.status(201).json({
      msg: "Usuario creado",
      user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (e) {
    console.error("Error en el registro de usuario", e);
    res.status(500).json({ error: "Error en el registro" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const { JWT_SECRET } = process.env;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { uid: user._id, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (e) {
    console.error("Error durante el login", e);
    res.status(500).json({ error: "Error en el login" });
  }
});

export default router;
