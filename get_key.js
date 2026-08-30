import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/app/applet/firebase-applet-config.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const doc = await db.collection('apiKeys').doc('singleton').get();
  console.log("KEY=", doc.data().geminiApiKey);
  process.exit(0);
}
run();
