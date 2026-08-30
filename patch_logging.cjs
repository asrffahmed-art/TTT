const fs = require('fs');

// Patch Server
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  'if (msg.type === "audio" && msg.audio) {',
  'if (msg.type === "audio" && msg.audio) {\n            console.log("[GEMINI LIVE] Received audio chunk from browser. Bytes:", msg.audio.length);'
);
fs.writeFileSync('server.ts', serverCode);

// Patch VoiceDialog
let dialogCode = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');
dialogCode = dialogCode.replace(
  "wsRef.current.send(JSON.stringify({",
  "console.log('[VOICE] bytes sent:', base64Audio.length);\n        wsRef.current.send(JSON.stringify({"
);
fs.writeFileSync('src/components/VoiceDialog.tsx', dialogCode);
