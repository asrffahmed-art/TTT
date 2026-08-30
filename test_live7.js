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
              if (part.text) {
                 console.log("GOT TEXT:", part.text);
              }
              if (part.inlineData) {
                 console.log("GOT AUDIO");
              }
           }
        }
      }
    }
  });
  
  await session.send({ clientContent: { turns: [ { role: 'user', parts: [ { text: "Say hello and explain who you are in one sentence" } ] } ] } });
  setTimeout(() => { session.close(); process.exit(0); }, 5000);
}
run();
