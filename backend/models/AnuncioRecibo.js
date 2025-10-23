// models/AnuncioRecibo.js
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  anuncio: { type: mongoose.Schema.Types.ObjectId, ref: "Anuncio", required: true, index: true },
  estado:  { type: String, enum: ["notified", "read"], default: "notified" },
  notifiedAt: { type: Date, default: Date.now },
  readAt:  { type: Date }
}, { timestamps: true });

// Un recibo por usuario/anuncio
schema.index({ usuario: 1, anuncio: 1 }, { unique: true });

export default mongoose.model("AnuncioRecibo", schema);
