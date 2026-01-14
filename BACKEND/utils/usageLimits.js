import UserActivityDaily from '../models/userActivityDailyModel.js'
import { getUtcDateKey } from './userActivity.js'
import { getUserPlanConfig } from './planConfig.js'

const FIELD_MAP = {
  messages: {
    activityField: 'chatMessageCount',
    limitField: 'messagesPerDay',
  },
  flashcards: {
    activityField: 'flashcardGeneratedCount',
    limitField: 'flashcardGenerationsPerDay',
  },
  quizzes: {
    activityField: 'quizGeneratedCount',
    limitField: 'quizGenerationsPerDay',
  },
  notes: {
    activityField: 'noteGeneratedCount',
    limitField: 'noteGenerationsPerDay',
  },
}

const getUsageRecord = async (userId) => {
  const dateKey = getUtcDateKey()
  const record = await UserActivityDaily.findOne({ userId, date: dateKey }).lean()
  return { dateKey, record: record || null }
}

const checkUsageLimit = async ({ userId, type, amount = 1 }) => {
  const mapping = FIELD_MAP[type]
  if (!mapping) {
    return { allowed: true, limit: null, used: 0, remaining: null }
  }

  const plan = await getUserPlanConfig(userId)
  const limitValue = Number(plan?.limits?.[mapping.limitField] ?? 0)
  const { record } = await getUsageRecord(userId)
  const used = Number(record?.[mapping.activityField] ?? 0)

  const limit = Number.isFinite(limitValue) ? limitValue : 0
  const remaining = Math.max(0, limit - used)
  const allowed = limit === 0 ? false : used + amount <= limit

  return {
    allowed,
    limit,
    used,
    remaining,
    planKey: plan?.key,
    planLabel: plan?.label,
  }
}

export { checkUsageLimit }
