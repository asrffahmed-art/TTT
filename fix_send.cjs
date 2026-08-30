const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `          if (msg.type === "text" && msg.text) {
             await session.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: msg.text }] }], turnComplete: true } });
          }
          if (msg.type === "audio" && msg.data) {
            console.log("[9] PCM_SENT_TO_GEMINI");
            await session.sendRealtimeInput([{
              mimeType: "audio/pcm;rate=16000",
              data: msg.data
            }]);
          }`;

const newBlock = `          if (msg.type === "text" && msg.text) {
             await session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: msg.text }] }], turnComplete: true });
          }
          if (msg.type === "audio" && msg.data) {
            console.log("[9] PCM_SENT_TO_GEMINI");
            await session.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            });
          }`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with correct methods");
