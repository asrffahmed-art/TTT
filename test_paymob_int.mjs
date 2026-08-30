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

  // Test with dummy / sample integration ID
  const testIntegrationId = "123456";

  console.log("Testing Paymob Intention API with secretKey & test Integration ID:", testIntegrationId);

  const intentBody = {
    amount: 10000,
    currency: "EGP",
    special_reference: "test_order_" + Date.now(),
    payment_methods: [Number(testIntegrationId)],
    billing_data: {
      first_name: "Test", last_name: "User", email: "test@example.com", phone_number: "+201000000000",
      apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "Cairo", postal_code: "NA", country: "EG", state: "NA"
    },
    customer: { first_name: "Test", last_name: "User", email: "test@example.com" },
    extras: { orderId: "123", userId: "test_user", planId: "ultra" }
  };

  const res = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Secret ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(intentBody)
  });

  const resData = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(resData, null, 2));
}

test().catch(console.error).finally(() => process.exit());
