import mongoose from "mongoose";

const rolesValidos = ["admin", "docente", "padre", "estudiante"];

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    email:  { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    rol: { type: String, enum: rolesValidos, default: "padre" },
    // NUEVO: lista de hijos (users con rol estudiante)
    hijos: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
