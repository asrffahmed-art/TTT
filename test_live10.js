import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview'
    });
    console.log("KEYS:", Object.keys(session));
    for (let key in session) {
      if (typeof session[key] === 'function') console.log("FUNC:", key);
    }
    setTimeout(() => { session.close(); process.exit(0); }, 1000);
  } catch(e) { console.error("ERR", e); }
}
run();
