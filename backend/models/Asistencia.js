import mongoose from "mongoose";

const estados = ["presente","ausente","tarde","justificado"];

const asistenciaSchema = new mongoose.Schema(
  {
    curso:  { type: mongoose.Schema.Types.ObjectId, ref: "Curso", required: true },
    alumno: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    fecha:  { type: String, required: true }, // "2025-09-30"
    estado: { type: String, enum: estados, default: "presente" },
    justificacion: {
      motivo: { type: String },
      archivoUrl: { type: String }, // /uploads/archivo.pdf
      cargadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fechaCarga: { type: Date },
      aprobado: { type: Boolean, default: false },
      revisadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }
  },
  { timestamps: true }
);

// Evita duplicados por alumno/curso/día:
asistenciaSchema.index({ curso: 1, alumno: 1, fecha: 1 }, { unique: true });

export default mongoose.model("Asistencia", asistenciaSchema);
