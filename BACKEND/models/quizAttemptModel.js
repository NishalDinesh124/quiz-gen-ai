import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "quizzes",
      index: true,
    },
    quizSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "quizSets",
      index: true,
    },
    quizOwnerId: {
      type: String,
    },
    score: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    mode: {
      type: String,
    },
    answers: [
      {
        questionIndex: Number,
        selected: mongoose.Schema.Types.Mixed,
        correct: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
      },
    ],
    currentIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "completed",
      index: true,
    },
    completedAt: {
      type: Date,
    },
    timeSpentSeconds: {
      type: Number,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ userId: 1, attemptedAt: -1 });
quizAttemptSchema.index({ userId: 1, quizId: 1, score: -1 });
quizAttemptSchema.index({ userId: 1, quizSetId: 1, score: -1 });

export default mongoose.model("quiz_attempts", quizAttemptSchema);
