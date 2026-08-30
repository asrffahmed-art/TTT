const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `            if (message.serverContent) {
               const modelTurn = message.serverContent.modelTurn;
               if (modelTurn && modelTurn.parts && modelTurn.parts.length > 0) {
                  const audio = modelTurn.parts[0]?.inlineData?.data;
                  if (audio && ws.readyState === 1) {
                     ws.send(JSON.stringify({ type: 'audio_stream', audio }));
                     console.log("[GEMINI LIVE] Sent audio chunk to browser", audio.length);
                  }
               }
               
               if (message.serverContent.interrupted && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
               }
               if (message.serverContent.turnComplete && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'turn_complete' }));
                  console.log("[GEMINI LIVE] Turn complete");
               }`;

const newLogic = `            if (message.serverContent) {
               const modelTurn = message.serverContent.modelTurn;
               if (modelTurn && modelTurn.parts) {
                  const audioPart = modelTurn.parts.find((p: any) => p.inlineData?.data);
                  if (audioPart && ws.readyState === 1) {
                     const audio = audioPart.inlineData.data;
                     const mimeType = audioPart.inlineData.mimeType || 'audio/pcm;rate=24000';
                     ws.send(JSON.stringify({ type: 'audio_stream', audio, mimeType }));
                     console.log("[GEMINI LIVE] AUDIO RECEIVED mimeType=", mimeType, "bytes=", audio.length);
                  }
               }
               
               if (message.serverContent.interrupted && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
               }
               if (message.serverContent.turnComplete && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'turn_complete' }));
                  console.log("[GEMINI LIVE] Turn complete");
               }`;

server = server.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', server);
console.log("Patched server.ts successfully");
