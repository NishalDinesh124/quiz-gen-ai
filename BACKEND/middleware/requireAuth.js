import admin from '../config/firebaseAdmin.js';
import { trackLoginOnce } from '../utils/userActivity.js';

export default async function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = decoded;
    trackLoginOnce(decoded?.uid).catch((err) => {
      console.error('Login tracking failed:', err);
    });
    return next();
  } catch (err) {
    console.error('Token verification failed:', err?.message || err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
