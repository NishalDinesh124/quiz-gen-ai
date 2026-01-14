import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const buildCredential = () => {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountRaw) {
    const parsed = JSON.parse(serviceAccountRaw);
    if (parsed?.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return admin.credential.cert(parsed);
  }

  return admin.credential.applicationDefault();
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: buildCredential(),
  });
}

export default admin;
