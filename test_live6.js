import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI();
async function run() {
  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: ["AUDIO", "TEXT"],
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
        },
        onerror: (err) => console.error("ERR CALLBACK:", err)
      }
    });
    
    await session.send({text: "Say a short hello"});
    setTimeout(() => { session.close(); process.exit(0); }, 6000);
  } catch (err) {
    console.error("CATCH:", err);
  }
}
run();
