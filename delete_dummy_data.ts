import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Cleaning up dummy ad data...');
  
  // Cleanup campaigns
  const campSnap = await getDocs(collection(db, 'campaigns'));
  for (const doc of campSnap.docs) {
    if (doc.id.startsWith('cmp_')) {
      await deleteDoc(doc.ref);
    }
  }

  // Cleanup creatives
  const crSnap = await getDocs(collection(db, 'adCreatives'));
  for (const doc of crSnap.docs) {
    if (doc.id.startsWith('crt_')) {
      await deleteDoc(doc.ref);
    }
  }

  // Cleanup advertisers
  const advSnap = await getDocs(collection(db, 'advertisers'));
  for (const doc of advSnap.docs) {
    if (doc.id.startsWith('adv_')) {
      await deleteDoc(doc.ref);
    }
  }

  // Cleanup adEvents
  const evtSnap = await getDocs(collection(db, 'adEvents'));
  for (const doc of evtSnap.docs) {
    const data = doc.data();
    if (data.eventId && data.eventId.includes('seed')) {
      await deleteDoc(doc.ref);
    }
  }
  
  // Cleanup data program datasets
  const dataSnap = await getDocs(collection(db, 'aiDatasets'));
  for (const doc of dataSnap.docs) {
    if (doc.id.startsWith('ds_')) {
       await deleteDoc(doc.ref);
    }
  }
  
  // Cleanup data program contributions
  const contrSnap = await getDocs(collection(db, 'aiContributions'));
  for (const doc of contrSnap.docs) {
     const data = doc.data();
     if (data.userId === 'usr_sample') {
         await deleteDoc(doc.ref);
     }
  }

  console.log('Done cleaning up all dummy configurations and events.');
}

run().catch(console.error).finally(() => process.exit(0));
