const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldAudioBlock = `          if (msg.type === "audio" && msg.data) {
            console.log("[9] PCM_SENT_TO_GEMINI");`;

const newAudioBlock = `          if (msg.type === "text" && msg.text) {
             await session.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: msg.text }] }], turnComplete: true } });
          }
          if (msg.type === "audio" && msg.data) {
            console.log("[9] PCM_SENT_TO_GEMINI");`;

code = code.replace(oldAudioBlock, newAudioBlock);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with text handling");
