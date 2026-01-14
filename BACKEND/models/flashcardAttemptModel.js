import mongoose from "mongoose";

const flashcardAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    flashcardSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flashcardSets",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
      index: true,
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
    totalCards: {
      type: Number,
      default: 0,
    },
    cardsSeen: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    nextReviewAt: {
      type: Date,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    cards: [
      {
        index: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["not_studied", "to_review"],
          default: "not_studied",
        },
        lastReviewedAt: {
          type: Date,
        },
        nextReviewAt: {
          type: Date,
        },
        lastRating: {
          type: String,
          enum: ["again", "hard", "good", "easy"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

flashcardAttemptSchema.index({ userId: 1, attemptedAt: -1 });
flashcardAttemptSchema.index({ userId: 1, flashcardSetId: 1, attemptedAt: -1 });

export default mongoose.model("flashcard_attempts", flashcardAttemptSchema);
