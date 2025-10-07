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

function buildUploader({ allowedTypes, maxSizeMB, errorMessage }) {
  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = allowedTypes.includes(file.mimetype);
      cb(ok ? null : new Error(errorMessage));
    },
  });
}

export const upload = buildUploader({
  allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
  maxSizeMB: 5,
  errorMessage: "Tipo de archivo no permitido (solo PDF/JPG/PNG)",
});

export const uploadExcel = buildUploader({
  allowedTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
    "text/csv",
    "text/plain",
  ],
  maxSizeMB: 5,
  errorMessage: "Tipo de archivo no permitido (solo Excel o CSV)",
});
