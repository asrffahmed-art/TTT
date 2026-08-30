const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Ensure correct model
code = code.replace(
  'const targetModel = "gemini-3.1-flash-live-preview";',
  'const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";'
);

// Fix the parts logic
const oldPartsLogicRegex = /const audioPart = modelTurn\.parts\?\.find\(\(part: any\) => part\?\.inlineData\?\.data\);\s*if\s*\(audioPart && ws\.readyState === 1\)\s*\{\s*const audio = audioPart\.inlineData\.data;\s*const mimeType = audioPart\.inlineData\.mimeType;[^}]+\s*\}[^}]*\}[^}]*\}/;

const newPartsLogic = `const parts = modelTurn.parts || [];
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
            }`;

if (code.match(oldPartsLogicRegex)) {
   code = code.replace(oldPartsLogicRegex, newPartsLogic);
   console.log("Replaced single-part find with multi-part loop.");
} else if (code.includes("const audioPart = modelTurn.parts?.find")) {
   console.log("Regex didn't match perfectly, trying string replace.");
   // manual replace
   const blockStart = code.indexOf("const audioPart = modelTurn.parts?.find");
   const blockEnd = code.indexOf("if (message.serverContent) {\n               if (message.serverContent.interrupted", blockStart);
   if (blockStart > -1 && blockEnd > -1) {
      code = code.substring(0, blockStart) + newPartsLogic + "\n            " + code.substring(blockEnd);
      console.log("String replaced!");
   }
}

// Add the interrupted handler explicitly if missing inside the block
if (!code.includes("type: 'interrupted'") && !code.includes("type: \"interrupted\"")) {
   code = code.replace(
     'if (message.serverContent) {',
     'if (message.serverContent) {\n               if (message.serverContent.interrupted && ws.readyState === 1) ws.send(JSON.stringify({ type: "interrupted" }));\n               if (message.serverContent.turnComplete && ws.readyState === 1) ws.send(JSON.stringify({ type: "turn_complete" }));'
   );
}

fs.writeFileSync('server.ts', code);
