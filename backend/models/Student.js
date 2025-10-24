// models/Student.js
import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  curso: { type: Number, required: true },
  division: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    get: (val) => (typeof val === "string" ? val.trim() : val),
  }, // admite número o string ("A", "TM", etc.)
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

// Búsqueda rápida por nombre (case-insensitive)
StudentSchema.index({ nombre: "text" });

export default mongoose.model("Student", StudentSchema);
