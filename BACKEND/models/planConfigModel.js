import mongoose from 'mongoose'

const planConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthly: {
      priceId: {
        type: String,
        default: '',
        trim: true,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    yearly: {
      priceId: {
        type: String,
        default: '',
        trim: true,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    limits: {
      messagesPerDay: {
        type: Number,
        default: 0,
        min: 0,
      },
      flashcardGenerationsPerDay: {
        type: Number,
        default: 0,
        min: 0,
      },
      quizGenerationsPerDay: {
        type: Number,
        default: 0,
        min: 0,
      },
      noteGenerationsPerDay: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  { timestamps: true },
)

export default mongoose.model('PlanConfig', planConfigSchema)
