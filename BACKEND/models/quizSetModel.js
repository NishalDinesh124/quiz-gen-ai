import mongoose from "mongoose";

const quizSetSchema = new mongoose.Schema(
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
    quizIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "quiz",
      },
    ],
    questions: {
      type: Array,
      default: [],
    },
    questionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("quizSets", quizSetSchema);
