const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = require('./firebase-applet-config.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, "systemConfig", "apiKeys");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const key = snap.data().geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    const models = await response.json();
    console.log(models.models ? models.models.map(m => m.name).filter(n => n.includes('gemma')) : models);
  }
  process.exit(0);
}
run();
