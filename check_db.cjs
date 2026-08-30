const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "ai-studio-aimodelchat-dd6a637e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const docRef = doc(db, "systemConfig", "apiKeys");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log(snap.data());
  } else {
    console.log("No apiKeys doc");
  }
  process.exit(0);
}
check();
