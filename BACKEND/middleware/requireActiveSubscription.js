import Subscription from '../models/subscriptionModel.js'

export default async function requireActiveSubscription(req, res, next) {
  const userId =
    (req.user && (req.user.uid || req.user.id)) ||
    (req.body && req.body.userId) ||
    (req.query && req.query.userId) ||
    req.headers['x-user-id']

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  try {
    const sub = await Subscription.findOne({ userId })

    if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
      return next()
    }

    return res.status(403).json({ error: 'Active subscription required' })
  } catch (err) {
    console.error('requireActiveSubscription error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
