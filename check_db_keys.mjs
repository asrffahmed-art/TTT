import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const snap = await getDoc(doc(db, "systemConfig", "apiKeys"));
  console.log("systemConfig/apiKeys Data:", snap.exists() ? snap.data() : "No doc found");
}

check().catch(console.error).finally(() => process.exit());
