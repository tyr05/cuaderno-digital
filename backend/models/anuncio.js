import mongoose from "mongoose";

const anuncioSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    contenido: { type: String, required: true },
    curso: { type: mongoose.Schema.Types.ObjectId, ref: "Curso", required: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    alumno: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    visiblePara: {
      type: String,
      enum: ["todos", "familia", "estudiantes", "docentes"], 
      default: "todos",
    },
    // más adelante podemos sumar: fechaHasta, archivos, etiquetas, etc.
  },
  { timestamps: true }
);

export default mongoose.model("Anuncio", anuncioSchema);
