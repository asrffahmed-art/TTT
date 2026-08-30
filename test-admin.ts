import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import config from "./firebase-applet-config.json" assert { type: "json" };

if (!getApps().length) {
  initializeApp({ projectId: config.projectId });
}
const db = getFirestore();
db.collection("systemConfig").doc("usagePlans").get().then((doc) => {
  console.log("Success:", doc.exists);
}).catch(console.error);
