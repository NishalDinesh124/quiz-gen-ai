import PlanConfig from '../models/planConfigModel.js'
import Subscription from '../models/subscriptionModel.js'

const DEFAULT_PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    sortOrder: 1,
    trialDays: 3,
    monthly: {
      amount: 4.99,
      priceId:
        process.env.STRIPE_PRICE_ID_STARTER_MONTHLY ||
        process.env.STRIPE_PRICE_ID_BASIC ||
        '',
    },
    yearly: {
      amount: 49.99,
      priceId: process.env.STRIPE_PRICE_ID_STARTER_YEARLY || '',
    },
    limits: {
      messagesPerDay: 50,
      flashcardGenerationsPerDay: 5,
      quizGenerationsPerDay: 5,
      noteGenerationsPerDay: 5,
    },
  },
  {
    key: 'plus',
    label: 'Plus',
    sortOrder: 2,
    trialDays: 3,
    monthly: {
      amount: 6.99,
      priceId:
        process.env.STRIPE_PRICE_ID_PLUS_MONTHLY ||
        process.env.STRIPE_PRICE_ID_PREMIUM ||
        '',
    },
    yearly: {
      amount: 69.99,
      priceId: process.env.STRIPE_PRICE_ID_PLUS_YEARLY || '',
    },
    limits: {
      messagesPerDay: 150,
      flashcardGenerationsPerDay: 15,
      quizGenerationsPerDay: 15,
      noteGenerationsPerDay: 15,
    },
  },
  {
    key: 'pro',
    label: 'Pro',
    sortOrder: 3,
    trialDays: 3,
    monthly: {
      amount: 8.99,
      priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || process.env.STRIPE_PRICE_ID_PRO || '',
    },
    yearly: {
      amount: 89.99,
      priceId: process.env.STRIPE_PRICE_ID_PRO_YEARLY || '',
    },
    limits: {
      messagesPerDay: 300,
      flashcardGenerationsPerDay: 30,
      quizGenerationsPerDay: 30,
      noteGenerationsPerDay: 30,
    },
  },
]

const normalizeKey = (value) => String(value || '').trim().toLowerCase()

const ensurePlanConfigs = async () => {
  await Promise.all(
    DEFAULT_PLANS.map((plan) =>
      PlanConfig.updateOne(
        { key: plan.key },
        { $setOnInsert: plan },
        { upsert: true },
      ),
    ),
  )
}

const listPlanConfigs = async ({ includeInactive = true } = {}) => {
  await ensurePlanConfigs()
  const filter = includeInactive ? {} : { isActive: true }
  return PlanConfig.find(filter).sort({ sortOrder: 1, label: 1 }).lean()
}

const getPlanConfigByKey = async (key) => {
  await ensurePlanConfigs()
  if (!key) return null
  return PlanConfig.findOne({ key: normalizeKey(key) }).lean()
}

const getPlanConfigByPriceId = async (priceId) => {
  await ensurePlanConfigs()
  if (!priceId) return null
  return PlanConfig.findOne({
    $or: [{ 'monthly.priceId': priceId }, { 'yearly.priceId': priceId }],
  }).lean()
}

const getUserPlanKey = async (userId) => {
  if (!userId) return 'starter'
  await ensurePlanConfigs()
  const subscription = await Subscription.findOne({ userId }).lean()
  if (!subscription) return 'starter'
  const status = String(subscription.status || '').toLowerCase()
  if (status !== 'active' && status !== 'trialing') return 'starter'
  const candidate = normalizeKey(subscription.plan)
  if (candidate) {
    const planByKey = await PlanConfig.findOne({ key: candidate }).lean()
    if (planByKey) return planByKey.key
    const planByPrice = await getPlanConfigByPriceId(subscription.plan)
    if (planByPrice) return planByPrice.key
  }
  return 'starter'
}

const getUserPlanConfig = async (userId) => {
  const key = await getUserPlanKey(userId)
  const config = await getPlanConfigByKey(key)
  return config || (await getPlanConfigByKey('starter'))
}

export {
  DEFAULT_PLANS,
  ensurePlanConfigs,
  getPlanConfigByKey,
  getPlanConfigByPriceId,
  getUserPlanConfig,
  getUserPlanKey,
  listPlanConfigs,
}
