import mongoose from "mongoose";

const fileMetaSchema = new mongoose.Schema(
  {
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      enum: ["ORPHAN", "ACTIVE", "EXPIRED"],
      default: "ORPHAN",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
  },
  { timestamps: true }
);

// Helper to mark file as active when order is placed
fileMetaSchema.methods.markActive = function (orderId) {
  this.status = "ACTIVE";
  this.orderId = orderId;
  // Extend expiry to much longer (e.g., 30 days) or remove TTL if handled by cron
  // For now, let's keep it and set a long expiration
  this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 
  return this.save();
};

export default mongoose.model("FileMeta", fileMetaSchema);
