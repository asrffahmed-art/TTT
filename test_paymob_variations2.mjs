import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  const data = snap.data();

  const secretKey = data.paymobSecretKey; // egy_sk_test_...

  const methodsToTest = [
    ["card"],
    ["card", "wallet"],
    [123456],
    ["CARD"],
    ["online_card"]
  ];

  for (const methods of methodsToTest) {
    console.log(`\nTesting payment_methods:`, methods);
    let res = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Authorization': `Secret ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 10000, // 100 EGP
        currency: "EGP",
        payment_methods: methods,
        billing_data: {
          first_name: "Test",
          last_name: "User",
          email: "test@example.com",
          phone_number: "+201000000000"
        }
      })
    });
    console.log("Status:", res.status, await res.json());
  }
}

test().catch(console.error).finally(() => process.exit());
