import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  const data = snap.data();

  const apiKey = data.paymobApiKey; // JWT ZXl...
  const secretKey = data.paymobSecretKey; // egy_sk_test_...

  console.log("1. Trying legacy auth token with api_key:", apiKey ? apiKey.substring(0, 15) : "none");
  let authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  console.log("Auth Res status:", authRes.status);
  let authData = await authRes.json();
  console.log("Auth token acquired:", !!authData.token);

  if (authData.token) {
    const token = authData.token;
    console.log("2. Trying to get merchant profile / integrations...");
    let profileRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Profile res status:", profileRes.status);
  }
}

test().catch(console.error).finally(() => process.exit());
