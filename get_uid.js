import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const users = await db.collection('users').where('email', '==', 'onq6974@gmail.com').get();
  if (users.empty) {
    console.log("No user found");
  } else {
    users.forEach(doc => console.log(doc.id));
  }
}
run();
