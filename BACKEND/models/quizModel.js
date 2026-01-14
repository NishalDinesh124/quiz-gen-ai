import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
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
    category: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    questions: [
      {
        type: {
          type: String,
          enum: ["multiple_choice", "single_choice", "true_false"],
          required: true,
        },
        question: {
          type: String,
          required: true,
        },
        options: {
          type: [String],
          default: [],
        },
        correctAnswer: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ["active","inactive"],
      default: "active",
      required: true,
    },
    timeConfig: {
      enabled: Boolean,

      mode: {
        type: String,
        enum: ["perQuiz", "perQuestion"],
        required: function () {
          return this.timeConfig?.enabled;
        },
      },

      totalTimeSeconds: Number, // used when mode === "perQuiz"
      perQuestionTimeSeconds: Number, // used when mode === "perQuestion"
    },
    expiryDate: {
      type: Date,
    },
    allowManualQuestions: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("quizzes", quizSchema);

// Quiz {
//   userId,
//   title,
//   category,
//   mode,
//   questions: [],
//   settings: {
//     timeLimit,
//     perQuestionTime,
//     expiry
//   }
// }
