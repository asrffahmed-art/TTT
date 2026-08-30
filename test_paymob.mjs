import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  const data = snap.data();
  console.log("DB Data:", data);

  const paymobSecret = data.paymobSecretKey || data.paymobApiKey;
  console.log("Paymob Secret length:", paymobSecret ? paymobSecret.length : 0);
  console.log("Paymob Secret prefix:", paymobSecret ? paymobSecret.substring(0, 15) : "none");

  const intentBody = {
    amount: 10000,
    currency: "EGP",
    special_reference: "test_order_" + Date.now(),
    billing_data: {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      phone_number: "+201000000000",
      apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "Cairo", postal_code: "NA", country: "EG", state: "NA"
    },
    customer: {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com"
    },
    extras: { orderId: "123", userId: "test_user", planId: "ultra_yearly" }
  };

  const intentRes = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${paymobSecret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(intentBody)
  });

  const intentData = await intentRes.json();
  console.log("Paymob Intention Response:", JSON.stringify(intentData, null, 2));
}

test().catch(console.error).finally(() => process.exit());
