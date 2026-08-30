import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  const session = await ai.live.connect({
    model: 'gemini-2.0-flash-exp', // Or whatever model
    config: {
      responseModalities: ["AUDIO"],
    },
    callbacks: {
      onmessage: (msg) => {
        console.log(JSON.stringify(msg, null, 2));
      }
    }
  });
  await session.sendRealtimeInput([{text: "Say hello and introduce yourself."}]);
  setTimeout(() => { session.close(); process.exit(0); }, 5000);
}
run().catch(console.error);
