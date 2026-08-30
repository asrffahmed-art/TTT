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

  // Step 1: Auth Token
  let authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  let authData = await authRes.json();
  const token = authData.token;

  // Step 2: Create Order
  let orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: "false",
      amount_cents: "10000",
      currency: "EGP",
      merchant_order_id: "test_" + Date.now(),
      items: []
    })
  });
  let orderData = await orderRes.json();
  console.log("Order Data ID:", orderData.id);

  // Step 3: Payment Key
  // Requires integration_id!
  let pKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: "10000",
      expiration: 3600,
      order_id: orderData.id,
      billing_data: {
        first_name: "Test", last_name: "User", email: "test@example.com", phone_number: "+201000000000",
        apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "Cairo", postal_code: "NA", country: "EG", state: "NA"
      },
      currency: "EGP",
      integration_id: 123456
    })
  });
  console.log("Payment Key status:", pKeyRes.status, await pKeyRes.json());
}

test().catch(console.error).finally(() => process.exit());
