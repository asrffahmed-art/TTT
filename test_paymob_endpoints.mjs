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
  const secretKey = data.paymobSecretKey;

  // 1. Authenticate with Legacy API
  let authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  let authData = await authRes.json();
  console.log("Auth token status:", authRes.status);
  const token = authData.token;

  if (token) {
    // Try endpoint to get merchant payment integrations
    const endpoints = [
      'https://accept.paymob.com/api/merchant/integrations',
      'https://accept.paymob.com/api/acceptance/payment_integrations',
      'https://accept.paymob.com/api/acceptance/payment_keys'
    ];
    for (const ep of endpoints) {
      let r = await fetch(ep, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(ep, "Status:", r.status);
      if (r.status === 200) {
        let resData = await r.json();
        console.log("Data:", JSON.stringify(resData, null, 2).substring(0, 300));
      }
    }
  }
}

test().catch(console.error).finally(() => process.exit());
