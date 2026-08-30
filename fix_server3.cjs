const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = "const modelTurn = message.serverContent.modelTurn;";

const blockStart = code.indexOf(targetStr);
const blockEnd = code.indexOf("if (message.serverContent.interrupted", blockStart);

if (blockStart !== -1 && blockEnd !== -1) {
    const replacement = `const modelTurn = message.serverContent.modelTurn;
               if (modelTurn && modelTurn.parts) {
                  const parts = modelTurn.parts || [];
                  for (const part of parts) {
                      if (part.inlineData && part.inlineData.data) {
                         const audio = part.inlineData.data;
                         const mimeType = part.inlineData.mimeType;
                         
                         console.log("[VOICE 13] GEMINI AUDIO FOUND");
                         console.log("mimeType =", mimeType);
                         console.log("bytes =", audio.length);
                         
                         if (ws.readyState === 1) {
                             ws.send(JSON.stringify({
                               type: 'audio_stream',
                               audio: audio,
                               mimeType: mimeType
                             }));
                         }
                      }
                  }
               }
               
               `;
    code = code.substring(0, blockStart) + replacement + code.substring(blockEnd);
    fs.writeFileSync('server.ts', code);
    console.log("Fixed!");
} else {
    console.log("Not found!");
}
