const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore();

async function run() {
  const docRef = db.collection("systemConfig").doc("apiKeys");
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data();
    console.log("geminiApiKey:", data.geminiApiKey?.substring(0, 4));
    console.log("customApiToken:", data.customApiToken?.substring(0, 4));
    console.log("googleSearchApiKey:", data.googleSearchApiKey?.substring(0, 4));
  }
  process.exit(0);
}
run();
