const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetOld = `  wss.on("connection", async (ws: WebSocket, req) => {
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

const targetNew = `  wss.on("connection", async (ws: WebSocket, req: any) => {
    try {
      if (!ai) { 
        await refreshAiClient();
      }

      const reqUrl = new URL(req.url || "", \`http://\${req.headers.host || "localhost"}\`);
      const selectedVoice = reqUrl.searchParams.get("voice") || "Aoede";
      const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];
      const finalVoiceName = validVoices.includes(selectedVoice) ? selectedVoice : "Aoede";

      const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";
      console.log("[GEMINI LIVE] Connecting to model:", targetModel, "with voice:", finalVoiceName);

      const session = await ai.live.connect({
        model: targetModel,
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: { parts: [{ text: "أنت THOTH، المساعد الصوتي المباشر. استمع للصوت وأجب عليه فورياً وبأسلوب راقٍ وموجز بالعربية. لا تسترسل في الحديث." }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoiceName } },
          },`;

if (code.includes(targetOld)) {
  code = code.replace(targetOld, targetNew);
  fs.writeFileSync('server.ts', code);
  console.log("Successfully updated server.ts for dynamic voice support!");
} else {
  console.log("targetOld not found, trying regex replacement");
  const regex = /wss\.on\("connection", async \(ws: WebSocket, req\) => \{[\s\S]*?voiceName: "Aoede" \},/g;
  code = code.replace(regex, `wss.on("connection", async (ws: WebSocket, req: any) => {
    try {
      if (!ai) { 
        await refreshAiClient();
      }

      const reqUrl = new URL(req.url || "", \`http://\${req.headers.host || "localhost"}\`);
      const selectedVoice = reqUrl.searchParams.get("voice") || "Aoede";
      const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];
      const finalVoiceName = validVoices.includes(selectedVoice) ? selectedVoice : "Aoede";

      const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";
      console.log("[GEMINI LIVE] Connecting to model:", targetModel, "with voice:", finalVoiceName);

      const session = await ai.live.connect({
        model: targetModel,
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: { parts: [{ text: "أنت THOTH، المساعد الصوتي المباشر. استمع للصوت وأجب عليه فورياً وبأسلوب راقٍ وموجز بالعربية. لا تسترسل في الحديث." }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: finalVoiceName } },
          },`);
  fs.writeFileSync('server.ts', code);
  console.log("Applied regex replacement in server.ts");
}
