import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview'
  });
  console.log("METHODS:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
  setTimeout(() => { session.close(); process.exit(0); }, 1000);
}
run();
