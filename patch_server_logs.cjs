const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'console.log("[10] GEMINI_MESSAGE_RECEIVED");',
  'console.log("[VOICE 12] GEMINI MESSAGE RECEIVED");'
);

content = content.replace(
  'console.log("[11] GEMINI_AUDIO_RECEIVED");',
  'console.log("[VOICE 13] GEMINI AUDIO FOUND");'
);

content = content.replace(
  'console.log("[12] AUDIO_SENT_TO_BROWSER");',
  'console.log("[VOICE 14] AUDIO STREAM SENT TO BROWSER");'
);

fs.writeFileSync('server.ts', content);
console.log('Server logs patched.');
