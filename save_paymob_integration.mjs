import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function save() {
  await setDoc(doc(db, "systemConfig", "apiKeys"), {
    paymobIntegrationId: "5616122"
  }, { merge: true });

  console.log("Paymob Integration ID 5616122 successfully saved to Firestore!");
}

save().catch(console.error).finally(() => process.exit());
