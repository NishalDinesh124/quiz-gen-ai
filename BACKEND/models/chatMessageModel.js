import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat_sessions",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "command", "asset"],
      default: "text",
    },
    content: {
      type: String,
      default: "",
    },
    assetType: {
      type: String,
      enum: ["flashcards", "quiz", "notes"],
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("chat_messages", chatMessageSchema);
