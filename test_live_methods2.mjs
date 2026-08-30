import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY || 'fake'});
async function test() {
  const session = await ai.live.connect({model: "gemini-2.0-flash-exp"});
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
  session.close();
}
test().catch(console.error);
