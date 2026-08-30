import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
    console.log("keyExists", !!process.env.GEMINI_API_KEY);
    console.log("keyLength", process.env.GEMINI_API_KEY?.length);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";
    
    try {
        console.log("Connecting...");
        const session = await ai.live.connect({
            model: targetModel,
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
                }
            },
            callbacks: {
                onmessage: (msg) => {
                    if (msg.setupComplete) {
                        console.log("Setup complete");
                    }
                    if (msg.serverContent) {
                        console.log("Got server content");
                    }
                }
            }
        });
        
        console.log("Connected successfully");
        
        setTimeout(() => {
            console.log("Sending text input...");
            session.send({
                clientContent: {
                    turns: [{ role: "user", parts: [{ text: "Hello! Just say hi." }] }],
                    turnComplete: true
                }
            });
        }, 1000);
        
        setTimeout(() => {
            session.close();
            console.log("Closed.");
        }, 5000);
    } catch(e: any) {
        console.error("Error:");
        console.error("error.name", e.name);
        console.error("error.message", e.message);
        console.error("error.code", e.code);
        console.error("error.stack", e.stack);
    }
}
run();
