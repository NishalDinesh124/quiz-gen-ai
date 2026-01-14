import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  stripeCustomerId: {
    type: String,
    required: false,
  },
  stripeSubscriptionId: {
    type: String,
    required: false,
    unique: true,
    index: true,
  },
  plan: {
    type: String,
    required: true,
    default: 'free',
  },
  status: {
    type: String,
    required: true,
    default: 'inactive',
  },
  currentPeriodEnd: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
})

export default mongoose.model('Subscription', subscriptionSchema)
