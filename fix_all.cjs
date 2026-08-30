const fs = require('fs');

// ----------------------------------------------------
// FIX server.ts
// ----------------------------------------------------
let serverCode = fs.readFileSync('server.ts', 'utf8');

const oldServerMessageRegex = /onmessage: \(message: any\) => \{[\s\S]*?onclose: \(\) => \{/m;
const newServerMessage = `onmessage: (message: any) => {
            console.log("[10] GEMINI_MESSAGE_RECEIVED");
            if (message.serverContent) {
               console.log("serverContent =", !!message.serverContent);
               console.log("modelTurn =", !!message.serverContent.modelTurn);
               console.log("parts.length =", message.serverContent.modelTurn?.parts?.length);
               console.log("turnComplete =", message.serverContent.turnComplete);
               console.log("interrupted =", message.serverContent.interrupted);
            }
            if (message.setupComplete) {
              console.log("[6] GEMINI_CONNECTED");
              console.log("[GEMINI LIVE] Setup complete, connection established.");
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'gemini_connected' }));
              }
            }
            
            if (message.serverContent) {
               const modelTurn = message.serverContent.modelTurn;
               if (modelTurn && modelTurn.parts) {
                  const audioPart = modelTurn.parts.find((p: any) => p.inlineData && p.inlineData.data);
                  if (audioPart && ws.readyState === 1) {
                     const audio = audioPart.inlineData.data;
                     const mimeType = audioPart.inlineData.mimeType;
                     
                     console.log("[11] GEMINI_AUDIO_RECEIVED");
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
                         console.log("rms =", rms.toFixed(2));
                       }
                     } catch (e) {}

                     console.log("[12] AUDIO_SENT_TO_BROWSER");
                     ws.send(JSON.stringify({ type: 'audio_stream', audio, mimeType }));
                  }
               }
               
               if (message.serverContent.interrupted && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
               }
               if (message.serverContent.turnComplete && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'turn_complete' }));
                  console.log("[GEMINI LIVE] Turn complete");
               }
            }
          },
          onclose: () => {`;
serverCode = serverCode.replace(oldServerMessageRegex, newServerMessage);
fs.writeFileSync('server.ts', serverCode);
console.log("server.ts fixed");
