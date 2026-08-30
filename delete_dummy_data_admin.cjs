const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
require('dotenv').config();

try {
  let app;
  const serviceAccountPath = './firebase-admin-key.json';
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    app = initializeApp(); // Application Default Credentials or env vars
  }

  const db = getFirestore(app);

  async function run() {
    console.log('Cleaning up dummy ad data (Admin)...');
    
    const campSnap = await db.collection('campaigns').get();
    for (const doc of campSnap.docs) {
      if (doc.id.startsWith('cmp_')) await doc.ref.delete();
    }

    const crSnap = await db.collection('adCreatives').get();
    for (const doc of crSnap.docs) {
      if (doc.id.startsWith('crt_')) await doc.ref.delete();
    }

    const advSnap = await db.collection('advertisers').get();
    for (const doc of advSnap.docs) {
      if (doc.id.startsWith('adv_')) await doc.ref.delete();
    }

    const evtSnap = await db.collection('adEvents').get();
    for (const doc of evtSnap.docs) {
      const data = doc.data();
      if (data.eventId && data.eventId.includes('seed')) await doc.ref.delete();
    }
    
    const dataSnap = await db.collection('aiDatasets').get();
    for (const doc of dataSnap.docs) {
      if (doc.id.startsWith('ds_')) await doc.ref.delete();
    }
    
    const contrSnap = await db.collection('aiContributions').get();
    for (const doc of contrSnap.docs) {
       const data = doc.data();
       if (data.userId === 'usr_sample') await doc.ref.delete();
    }

    console.log('Done cleaning up all dummy configurations and events.');
  }

  run().catch(console.error).finally(() => process.exit(0));
} catch (err) {
  console.error(err);
}
