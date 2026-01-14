import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    title: { type: String, required: true },
  },
  { _id: false }
);

const videoContextSchema = new mongoose.Schema(
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
    videoId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    transcriptStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "unavailable",
    },
    transcriptError: {
      type: String,
      default: "",
    },
    transcript: {
      type: [transcriptSchema],
      default: [],
    },
    chapters: {
      type: [chapterSchema],
      default: [],
    },
    chaptersStatus: {
      type: String,
      enum: ["pending", "available", "unavailable", "failed"],
      default: "unavailable",
    },
    chaptersError: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

videoContextSchema.index({ userId: 1, sessionId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("video_contexts", videoContextSchema);
