import mongoose from "mongoose";

const chatContextSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat_sessions",
      required: true,
    },
    sourceType: {
      type: String,
      default: "unknown",
    },
    sourceValue: {
      type: String,
      default: "",
    },
    sourceHash: {
      type: String,
      required: true,
    },
    chunks: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Object,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

chatContextSchema.index({ userId: 1, sessionId: 1, sourceHash: 1 }, { unique: true });
chatContextSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("chat_contexts", chatContextSchema);
