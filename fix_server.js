const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Change target model to gemini-3.1-flash-live-preview
code = code.replace(
  'const targetModel = "gemini-2.5-flash-native-audio-preview-12-2025";',
  'const targetModel = "gemini-3.1-flash-live-preview";'
);

// 2. Fix finding audio parts: instead of finding one, we will find all and send them one by one.
const oldPartsLogic = `const audioPart = modelTurn.parts?.find((part: any) => part?.inlineData?.data);
                  if (audioPart && ws.readyState === 1) {
                     const audio = audioPart.inlineData.data;
                     const mimeType = audioPart.inlineData.mimeType;
                     
                     console.log("[VOICE 13] GEMINI AUDIO FOUND");
                     console.log("mimeType =", mimeType);
                     console.log("bytes =", audio.length);
                     
                     // Decode base64 to check RMS
                     try {
                       const binary = atob(audio);
                       const len = binary.length;
                       const buffer = new ArrayBuffer(len);
                       const view = new Uint8Array(buffer);
                       for (let i = 0; i < len; i++) {
                         view[i] = binary.charCodeAt(i);
                       }
                       // Check alignment
                       if (len % 2 !== 0) {
                         console.error("[GEMINI AUDIO] Invalid PCM byte length", len);
                       } else {
                         const int16View = new Int16Array(buffer);
                         let sumSquares = 0;
                         let peak = 0;
                         let min = 0;
                         let max = 0;
                         for (let i = 0; i < int16View.length; i++) {
                           const s = int16View[i];
                           sumSquares += s * s;
                           if (Math.abs(s) > peak) peak = Math.abs(s);
                           if (s < min) min = s;
                           if (s > max) max = s;
                         }
                         const rms = Math.sqrt(sumSquares / int16View.length);
                         console.log("[GEMINI AUDIO ANALYSIS]");
                         console.log("samples =", int16View.length);
                         console.log("min =", min);
                         console.log("max =", max);
                         console.log("rms =", rms.toFixed(4));
                       }
                     } catch(e){}

                     ws.send(JSON.stringify({
                       type: 'audio_stream',
                       audio: audio,
                       mimeType: mimeType
                     }));
                  }`;

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
                  }`;
                  
code = code.replace(oldPartsLogic, newPartsLogic);

// Wait, I should also ensure we are handling interrupts.
// `serverContent.interrupted` is handled in `ws.send({ type: 'interrupted' })`?
// Let's check how interrupted is handled.
if (!code.includes("type: 'interrupted'") && code.includes("message.serverContent.interrupted")) {
    const interruptLogicOld = `if (message.serverContent.turnComplete) {
                  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'turn_complete' }));
               }`;
    const interruptLogicNew = `if (message.serverContent.interrupted) {
                  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'interrupted' }));
               }
               if (message.serverContent.turnComplete) {
                  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'turn_complete' }));
               }`;
    code = code.replace(interruptLogicOld, interruptLogicNew);
} else {
    code = code.replace(
      'if (message.serverContent) {',
      'if (message.serverContent) {\n               if (message.serverContent.interrupted && ws.readyState === 1) ws.send(JSON.stringify({ type: "interrupted" }));\n               if (message.serverContent.turnComplete && ws.readyState === 1) ws.send(JSON.stringify({ type: "turn_complete" }));'
    );
}

fs.writeFileSync('server.ts', code);
console.log("server.ts modified.");
