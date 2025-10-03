import mongoose from "mongoose";

const cursoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    anio: { type: Number, required: true }, // ej. 1, 2, 3
    division: { type: String }, // ej. "A", "B"
    docentes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    alumnos: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default mongoose.model("Curso", cursoSchema);
