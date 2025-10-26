// models/Student.js
import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    curso: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      set: (val) => {
        if (typeof val === "string") return val.trim();
        if (typeof val === "number") return val;
        return val;
      },
    },
    division: { type: String, required: true, trim: true },
    codigo: {
      type: String,
      required: true,
      trim: true,
      set: (val) => (typeof val === "string" ? val.trim().toUpperCase() : val),
    },
    codigoUsado: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } },
);

StudentSchema.path("codigo").validate((value) => {
  if (typeof value !== "string") return false;
  return /^[A-Z]{3}-\d{2}-\d{3}$/.test(value.trim());
}, "Formato de código inválido");

// Búsqueda rápida por nombre (case-insensitive)
StudentSchema.index({ nombre: "text" });
StudentSchema.index({ codigo: 1 }, { unique: true });

export default mongoose.models.Student || mongoose.model("Student", StudentSchema, "estudiantes");
