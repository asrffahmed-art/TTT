const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const idx = code.indexOf('wss.on("connection"');
if (idx !== -1) {
  const before = code.slice(0, idx);
  const after = code.slice(idx);
  
  const oldChunk = `wss.on("connection", async (ws: WebSocket, req) => {
    try {
      if (!ai) {
         await refreshAiClient();
      }
      
      const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";
      console.log("[GEMINI LIVE] Connecting to model:", targetModel);
      
      const session = await ai.live.connect({
        model: targetModel,
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: { parts: [{ text: "أنت THOTH، المساعد الصوتي المباشر. استمع للصوت وأجب عليه فورياً وبأسلوب راقٍ وموجز بالعربية. لا تسترسل في الحديث." }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },`;

  const newChunk = `wss.on("connection", async (ws: WebSocket, req: any) => {
    try {
      if (!ai) {
         await refreshAiClient();
      }

      const reqUrl = new URL(req?.url || "", \`http://\${req?.headers?.host || "localhost"}\`);
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
          },`;

  if (after.startsWith(oldChunk)) {
    code = before + after.replace(oldChunk, newChunk);
    fs.writeFileSync('server.ts', code);
    console.log("REPLACED SUCCESSFULLY!");
  } else {
    console.log("Mismatch on after.startsWith(oldChunk)");
  }
}
