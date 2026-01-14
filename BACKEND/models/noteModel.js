import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat_sessions",
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("notes", noteSchema);
