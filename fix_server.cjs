const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /wss\.on\("connection", async \(ws: WebSocket, req\) => \{[\s\S]*\}\);/g;

const newWsLogic = `wss.on("connection", async (ws: WebSocket, req) => {
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
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              silenceDurationMs: 1000,
            }
          }
        },
        callbacks: {
          onmessage: (message: any) => {
            if (message.setupComplete) {
              console.log("[GEMINI LIVE] Setup complete, connection established.");
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'live_ready' }));
              }
            }
            
            if (message.serverContent) {
               const modelTurn = message.serverContent.modelTurn;
               if (modelTurn && modelTurn.parts) {
                  const parts = modelTurn.parts || [];
                  for (const part of parts) {
                      if (part.inlineData && part.inlineData.data) {
                         const audio = part.inlineData.data;
                         const mimeType = part.inlineData.mimeType;
                         if (ws.readyState === 1) {
                             ws.send(JSON.stringify({
                               type: 'audio',
                               audio: audio,
                               mimeType: mimeType
                             }));
                         }
                      }
                  }
               }
               
               if (message.serverContent.interrupted && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
               }
               if (message.serverContent.turnComplete && ws.readyState === 1) {
                  ws.send(JSON.stringify({ type: 'turn_complete' }));
               }
            }
          },
          onclose: () => {
            console.log("[GEMINI LIVE] Connection closed");
            if (ws.readyState === 1) ws.close();
          },
          onerror: (err: any) => {
            console.error("[GEMINI LIVE ERROR]:", err);
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: 'error', message: 'حدث خطأ في الاتصال بالصوت المباشر.' }));
            }
          }
        }
      });
      
      console.log("[GEMINI LIVE] Session started for browser WebSocket");
      
      ws.on("message", async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "stop") {
              session.close();
              ws.close();
          }
          if (msg.type === "audio" && msg.audio) {
            await session.sendRealtimeInput({
              audio: {
                mimeType: msg.mimeType || "audio/pcm;rate=16000",
                data: msg.audio
              }
            });
          }
        } catch (e) {
          console.error("[GEMINI LIVE ERROR] Error sending to live session", e);
        }
      });
      
      ws.on("close", () => {
        console.log("[GEMINI LIVE] Browser WebSocket closed");
        try { session.close(); } catch(e) {}
      });
      
      ws.on("error", (err) => {
        console.error("[GEMINI LIVE ERROR] Browser WebSocket error", err);
        try { session.close(); } catch(e) {}
      });
      
    } catch (err) {
      console.error("[GEMINI LIVE ERROR] Failed to setup Live API:", err);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message: 'فشل تهيئة الاتصال المباشر: ' + String(err) }));
      }
    }
  });`;

code = code.replace(targetRegex, newWsLogic);
fs.writeFileSync('server.ts', code);
