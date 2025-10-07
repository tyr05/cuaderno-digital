import { Router } from "express";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import xlsx from "xlsx";
import Curso from "../models/Curso.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadExcel } from "../middleware/upload.js";

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

function pickValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str) return str;
  }
  return "";
}

function buildNombre(row) {
  const nombre = pickValue(row, [
    "Nombre",
    "nombre",
    "Nombres",
    "nombres",
    "First Name",
    "FirstName",
    "first_name",
    "firstName",
  ]);
  const apellido = pickValue(row, [
    "Apellido",
    "apellido",
    "Apellidos",
    "apellidos",
    "Last Name",
    "LastName",
    "last_name",
    "lastName",
  ]);

  if (nombre || apellido) {
    return `${nombre} ${apellido}`.trim();
  }

  return pickValue(row, [
    "Nombre completo",
    "nombre completo",
    "Alumno",
    "alumno",
    "Estudiante",
    "estudiante",
    "Name",
    "name",
  ]);
}

function buildEmail(row) {
  const raw = pickValue(row, [
    "Email",
    "email",
    "Correo",
    "correo",
    "Correo electrónico",
    "correo electrónico",
    "Mail",
    "mail",
  ]);
  return raw.toLowerCase();
}

function buildPassword(row, email) {
  const explicit = pickValue(row, [
    "Password",
    "password",
    "Contraseña",
    "contraseña",
    "Contrasena",
    "contrasena",
    "Clave",
    "clave",
  ]);
  if (explicit) return explicit;

  const documento = pickValue(row, [
    "DNI",
    "dni",
    "Documento",
    "documento",
    "Legajo",
    "legajo",
  ]);
  if (documento) return documento;

  if (email && email.includes("@")) {
    return email.split("@")[0];
  }

  return `temporal-${Math.random().toString(36).slice(-8)}`;
}

function isRowEmpty(row) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

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

// Importar alumnos desde un Excel/CSV
router.post(
  "/:id/importar-alumnos",
  requireAuth,
  requireRole("admin", "docente"),
  uploadExcel.single("archivo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Subí un archivo Excel o CSV." });
    }

    try {
      const curso = await Curso.findById(req.params.id);
      if (!curso) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const workbook = xlsx.readFile(req.file.path);
      const [firstSheetName] = workbook.SheetNames;
      if (!firstSheetName) {
        return res.status(400).json({ error: "El archivo no contiene datos." });
      }

      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "" });
      const summary = {
        procesados: 0,
        creados: 0,
        actualizados: 0,
        vinculados: 0,
        yaAsignados: 0,
        omitidos: [],
        credencialesNuevas: [],
      };

      const alumnoIds = new Set(curso.alumnos.map((id) => id.toString()));

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (isRowEmpty(row)) continue;

        summary.procesados += 1;

        const nombre = buildNombre(row);
        const email = buildEmail(row);
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!nombre || !emailValido) {
          summary.omitidos.push({ fila: index + 2, motivo: "Falta nombre o email válido" });
          continue;
        }

        let user = await User.findOne({ email });
        let passwordPlano = null;
        let updated = false;

        if (!user) {
          passwordPlano = buildPassword(row, email);
          const passwordHash = await bcrypt.hash(passwordPlano, 10);
          user = await User.create({
            nombre,
            email,
            passwordHash,
            rol: "estudiante",
          });
          summary.creados += 1;
          summary.credencialesNuevas.push({ email: user.email, passwordTemporal: passwordPlano });
        } else {
          const updates = {};
          if (user.rol !== "estudiante") {
            updates.rol = "estudiante";
          }
          if (nombre && user.nombre !== nombre) {
            updates.nombre = nombre;
          }

          if (Object.keys(updates).length > 0) {
            user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
            summary.actualizados += 1;
            updated = true;
          }

        }

        const userIdStr = user._id.toString();
        const yaEstaba = alumnoIds.has(userIdStr);

        const result = await Curso.updateOne(
          { _id: curso._id },
          { $addToSet: { alumnos: user._id } },
        );

        if (result.modifiedCount > 0 && !yaEstaba) {
          summary.vinculados += 1;
          alumnoIds.add(userIdStr);
        } else if (yaEstaba) {
          summary.yaAsignados += 1;
        } else if (!yaEstaba) {
          alumnoIds.add(userIdStr);
        }
      }

      const cursoActualizado = await Curso.findById(curso._id).populate(
        "docentes alumnos",
        "nombre email rol",
      );

      res.json({ curso: cursoActualizado, resumen: summary });
    } catch (error) {
      console.error("Error importando alumnos:", error);
      res.status(500).json({ error: "No se pudo importar la lista de estudiantes" });
    } finally {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
    }
  },
);

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
