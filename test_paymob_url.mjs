import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  const data = snap.data();

  const secretKey = data.paymobSecretKey;
  const publicKey = data.paymobPublicKey || "egy_pk_test_635d64c798b5ef0509a33311c2129e3a9bcf2dca88bff1aa0dd600e92d448708";
  const integrationId = data.paymobIntegrationId;

  const intentBody = {
    amount: 10000,
    currency: "EGP",
    special_reference: "test_order_" + Date.now(),
    payment_methods: [Number(integrationId)],
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
  console.log("Client secret:", resData.client_secret);

  const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${resData.client_secret}`;
  console.log("Generated Payment URL:", paymentUrl);

  const testFetch = await fetch(paymentUrl);
  console.log("Payment URL Status:", testFetch.status);
}

test().catch(console.error).finally(() => process.exit());
