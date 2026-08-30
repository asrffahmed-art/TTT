import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import config from "./firebase-applet-config.json" assert { type: "json" };

async function main() {
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);
  
  await setDoc(doc(db, "systemConfig", "apiKeys"), {
    paypalMode: "sandbox" 
  }, { merge: true });
  
  console.log("Keys injected successfully!");
  process.exit(0);
}

main().catch(console.error);
