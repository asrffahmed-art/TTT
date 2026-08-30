import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
if (!getApps().length) {
  initializeApp({
    projectId: config.projectId,
  });
}

const adminDb = getFirestore(config.firestoreDatabaseId);

async function test() {
  const docRef = adminDb.collection("systemConfig").doc("apiKeys");
  const snap = await docRef.get();
  console.log("Admin Firestore snap exists?", snap.exists);
  if (snap.exists) {
    console.log("Data keys:", Object.keys(snap.data()));
  }
}

test().catch(console.error).finally(() => process.exit());
