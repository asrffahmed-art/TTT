import { initializeApp as initFirebaseAdmin } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const firebaseConfig = { projectId: "ai-studio-aimodelchat-dd6a637e" };
const app = initFirebaseAdmin(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const keysSnap = await db.collection("systemConfig").doc("apiKeys").get();
  const apiSnap = await db.collection("systemConfig").doc("api").get();
  console.log("keys:", keysSnap.data());
  console.log("api:", apiSnap.data());
}
run();
