import mongoose from "mongoose";

const flashcardSetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    flashcardIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "flashCards",
      },
    ],
    cards: [
      {
        front: {
          type: String,
          required: true,
        },
        back: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
        },
      },
    ],
    cardCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("flashcardSets", flashcardSetSchema);
