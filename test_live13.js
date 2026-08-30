import { GoogleGenAI } from '@google/genai';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/app/applet/firebase-applet-config.json', 'utf8'));

// The admin DB doesn't work with client config, wait... 
// We can just fetch the key from the frontend or I can grab it from my web browser!
