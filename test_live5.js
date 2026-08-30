import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  const session = await ai.live.connect({
    model: 'gemini-2.0-flash-exp',
    config: {
      responseModalities: ["AUDIO"],
    }
  });
  
  session.on('message', (msg) => {
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
  });
  
  await session.send({text: "Say a short hello"});
  setTimeout(() => { session.close(); process.exit(0); }, 8000);
}
run().catch(console.error);
