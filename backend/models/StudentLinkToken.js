// models/StudentLinkToken.js
import mongoose, { Schema } from "mongoose";

const StudentLinkTokenSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true }, // User rol "estudiante"
    code:      { type: String, required: true },                                           // ej: A9K4QJ3T
    expiresAt: { type: Date },                                                            // fecha de vencimiento
    uses:      { type: Number, default: 0 },                                              // veces usado
    maxUses:   { type: Number, default: 1 }                                               // 1 = un solo responsable
  },
  { timestamps: true }
);

StudentLinkTokenSchema.index({ code: 1 }, { unique: true, name: "uniq_code" });

// Reutiliza el modelo si ya existe (evita error en hot-reload)
export default mongoose.models.StudentLinkToken
  ?? mongoose.model("StudentLinkToken", StudentLinkTokenSchema);
