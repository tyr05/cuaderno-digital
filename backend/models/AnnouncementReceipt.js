// models/AnnouncementReceipt.js
import mongoose from "mongoose";

const AnnouncementReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  announcement: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement", index: true, required: true },
  status: { type: String, enum: ["notified", "read"], default: "notified" },
  notifiedAt: { type: Date, default: Date.now },
  readAt: { type: Date }
}, { timestamps: true });

AnnouncementReceiptSchema.index({ user: 1, announcement: 1 }, { unique: true });

export default mongoose.model("AnnouncementReceipt", AnnouncementReceiptSchema);
