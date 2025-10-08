// middleware/upload.js
import multer from "multer";
import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch { /* noop */ }

// --- Almacenamiento en disco para todos los uploads ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = (file.originalname || "archivo").replace(/\s+/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

// --- Helpers de validación ---
const EXCEL_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                          // .xls (genérico)
  "text/csv",
  "text/plain",
  "application/octet-stream", // algunos navegadores lo mandan así
]);

function isExcelLike(file) {
  if (EXCEL_MIMES.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  return [".xlsx", ".xls", ".csv"].includes(ext);
}

const DOC_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/octet-stream", // tolerante
]);

function isDocLike(file) {
  if (DOC_MIMES.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext);
}

// --- Export 1: para certificados (PDF/imagenes) ---
// Usado en routes/asistencias.js → upload.single("certificado")
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (isDocLike(file)) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido (PDF/PNG/JPG/WEBP)"));
  },
});

// --- Export 2: para planillas Excel/CSV de alumnos ---
// Usado en routes/cursos.js → uploadExcel.single("archivo")
export const uploadExcel = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (isExcelLike(file)) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido (solo Excel o CSV)"));
  },
});
