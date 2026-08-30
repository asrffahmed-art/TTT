import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  const data = snap.data();
  const apiKey = data.paymobApiKey;

  let authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  let authData = await authRes.json();
  console.log("Auth Data Keys:", Object.keys(authData));
  if (authData.profile) {
    console.log("Profile merchant_id:", authData.profile.id);
  }
}

test().catch(console.error).finally(() => process.exit());
