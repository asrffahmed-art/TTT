import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, terminate } from "firebase/firestore";
import config from "./firebase-applet-config.json" assert { type: "json" };

const app = initializeApp(config);
const dbWeb = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const snap = await getDoc(doc(dbWeb, "systemConfig", "usagePlans"));
    console.log("systemConfig/usagePlans exists:", snap.exists());
    
    const snap2 = await getDoc(doc(dbWeb, "guestUsage", "test_ip"));
    console.log("guestUsage/test_ip exists:", snap2.exists());
    
    await setDoc(doc(dbWeb, "guestUsage", "test_ip"), { test: true });
    console.log("guestUsage set success");
    
    const userRef = doc(dbWeb, "users", "test_user_id");
    const snap3 = await getDoc(userRef);
    console.log("users/test_user_id exists:", snap3.exists());
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await terminate(dbWeb);
    process.exit(0);
  }
}
run();
