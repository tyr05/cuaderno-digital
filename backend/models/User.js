// models/User.js
import mongoose from "mongoose";

const hijoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  curso: { type: String, trim: true },
  division: { type: String, trim: true },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: true });

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  rol: { type: String, enum: ["admin", "docente", "familia", "estudiante"], required: true },
  hijos: [hijoSchema],
}, { timestamps: true });

export default mongoose.model("User", userSchema);
