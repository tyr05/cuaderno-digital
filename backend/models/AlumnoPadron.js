import mongoose from "mongoose";

const alumnoPadronSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    curso: { type: String, required: true, trim: true },
    division: { type: String, required: true, trim: true },
    codigo: { type: String, required: true, unique: true, trim: true },
    vinculado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

alumnoPadronSchema.index({ codigo: 1 }, { unique: true });

export default mongoose.model("AlumnoPadron", alumnoPadronSchema);
