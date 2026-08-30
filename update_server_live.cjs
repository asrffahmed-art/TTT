const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  '  wss.on("connection", async (ws: WebSocket, req) => {\n    try {\n      if (!ai) {\n         await refreshAiClient();\n      }\n            \n      const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";\n      console.log("[GEMINI LIVE] Connecting to model:", targetModel);\n            \n      const session = await ai.live.connect({\n        model: targetModel,\n        config:\n          responseModalities: ["AUDIO"],\n          systemInstruction: { parts: [{ text: "أنت THOTH، المساعد الصوتي المباشر. استمع للصوت وأجب عليه فورياً وبأسلوب راقٍ وموجز بالعربية. لا تسترسل في الحديث." }] },\n          speechConfig: {\n            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },\n          },',
  `  wss.on("connection", async (ws: WebSocket, req: any) => {
    try {
      if (!ai) { 
         await refreshAiClient();
      }

      const reqUrl = new URL(req.url || "", \`http://\${req.headers?.host || "localhost"}\`);
      const selectedVoice = reqUrl.searchParams.get("voice") || "Aoede";
      const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];
      const finalVoiceName = validVoices.includes(selectedVoice) ? selectedVoice : "Aoede";

      const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";
      console.log("[GEMINI LIVE] Connecting to model:", targetModel, "Voice:", finalVoiceName);

      const session = await ai.live.connect({
        model: targetModel,
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: { parts: [{ text: "أنت THOTH، المساعد الصوتي المباشر. استمع للصوت وأجب عليه فورياً وبأسلوب راقٍ وموجز بالعربية. لا تسترسل في الحديث." }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoiceName } },
          },`
);

fs.writeFileSync('server.ts', code);
console.log("Updated server.ts successfully");
