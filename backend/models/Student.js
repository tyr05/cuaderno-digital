// models/Student.js
import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  curso: { type: Number, required: true },
  division: { type: Number, required: true }, // o String "TM/TT" si usás letras
}, { timestamps: true });

// Búsqueda rápida por nombre (case-insensitive)
StudentSchema.index({ nombre: "text" });

export default mongoose.model("Student", StudentSchema);
