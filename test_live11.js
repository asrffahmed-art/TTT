import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: ["AUDIO"],
    },
    callbacks: {
      onmessage: (msg) => {
        if (msg.serverContent && msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
           for (const part of msg.serverContent.modelTurn.parts) {
              console.log(Object.keys(part));
           }
        }
      }
    }
  });
  
  await session.sendRealtimeInput([{text: "Say hello"}]);
  setTimeout(() => { session.close(); process.exit(0); }, 4000);
}
run();
