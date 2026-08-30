import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY || 'fake'});
async function test() {
  const session = await ai.live.connect({model: "gemini-2.0-flash-exp"}); // Or any live model
  console.log(Object.keys(session));
  session.close();
}
test().catch(e => console.log(e.message));
