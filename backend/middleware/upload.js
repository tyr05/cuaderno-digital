import multer from "multer";
import fs from "fs";

export const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
    cb(ok ? null : new Error("Tipo de archivo no permitido (solo PDF/JPG/PNG)"));
  },
});
