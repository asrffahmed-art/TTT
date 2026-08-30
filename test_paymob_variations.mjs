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

  console.log("apiKey:", apiKey ? apiKey.substring(0, 20) + "..." : "none");
  console.log("secretKey:", secretKey ? secretKey.substring(0, 20) + "..." : "none");

  // Variation 1: Authorization: Secret <secretKey>
  console.log("\n--- Variation 1: Authorization: Secret <secretKey> ---");
  let res1 = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Secret ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 10000,
      currency: "EGP",
      payment_methods: [], // empty or missing?
      billing_data: {
        first_name: "Test", last_name: "User", email: "test@example.com", phone_number: "+201000000000"
      }
    })
  });
  console.log("Status 1:", res1.status, await res1.json());

  // Variation 2: Authorization: Secret <secretKey> with Token/Secret header format
  console.log("\n--- Variation 2: Authorization: Token <secretKey> ---");
  let res2 = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 10000,
      currency: "EGP",
      billing_data: {
        first_name: "Test", last_name: "User", email: "test@example.com", phone_number: "+201000000000"
      }
    })
  });
  console.log("Status 2:", res2.status, await res2.json());

  // Variation 3: Authorization: Token <apiKey (JWT)>
  console.log("\n--- Variation 3: Authorization: Token <apiKey (JWT)> ---");
  let res3 = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 10000,
      currency: "EGP",
      billing_data: {
        first_name: "Test", last_name: "User", email: "test@example.com", phone_number: "+201000000000"
      }
    })
  });
  console.log("Status 3:", res3.status, await res3.json());
}

test().catch(console.error).finally(() => process.exit());
