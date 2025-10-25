import mongoose from "mongoose";

const FamilyStudentSchema = new mongoose.Schema(
  {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FamilyStudentSchema.index({ familyId: 1, studentId: 1 }, { unique: true });
FamilyStudentSchema.index({ studentId: 1 }, { unique: true });

export default mongoose.models.FamilyStudent || mongoose.model("FamilyStudent", FamilyStudentSchema);
