import mongoose from "mongoose";

const userActivityDailySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    quizGeneratedCount: {
      type: Number,
      default: 0,
    },
    flashcardGeneratedCount: {
      type: Number,
      default: 0,
    },
    noteGeneratedCount: {
      type: Number,
      default: 0,
    },
    chatMessageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userActivityDailySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("userActivityDaily", userActivityDailySchema);
