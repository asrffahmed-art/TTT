const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. & 2. Audio Context Ready and Test Tone
code = code.replace(
  'console.log("[VOICE DEBUG] Start button clicked, creating output AudioContext");',
  `console.log("[1] USER_CLICK");
      console.log("[VOICE DEBUG] Start button clicked, creating output AudioContext");`
);

code = code.replace(
  'console.log("[VOICE DEBUG] Output AudioContext sampleRate =", outputAudioCtxRef.current.sampleRate);',
  `console.log("[2] AUDIO_CONTEXT_READY");
      console.log("[AUDIO DEBUG] state =", outputAudioCtxRef.current.state);
      console.log("[AUDIO DEBUG] sampleRate =", outputAudioCtxRef.current.sampleRate);
      
      // Play Test Tone
      try {
        const osc = outputAudioCtxRef.current.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, outputAudioCtxRef.current.currentTime); // 440Hz A4
        osc.connect(outputAudioCtxRef.current.destination);
        osc.start();
        osc.stop(outputAudioCtxRef.current.currentTime + 0.5); // Play for 0.5s
        console.log("[TEST TONE] Playing 440Hz sine wave for 0.5s");
      } catch (e) {
        console.error("[TEST TONE ERROR]", e);
      }`
);

// 3. Microphone Ready
code = code.replace(
  '// 2. Setup AudioContext and ScriptProcessor for streaming raw PCM to Gemini',
  `console.log("[3] MICROPHONE_READY");
      // 2. Setup AudioContext and ScriptProcessor for streaming raw PCM to Gemini`
);

// We need a variable for mic chunks
code = code.replace(
  'let resampleRatio = 1;',
  `let resampleRatio = 1;
      let micChunkCount = 0;
      let firstPcmCaptured = false;`
);

// 7. PCM Captured and 8. PCM Sent to Server
code = code.replace(
  '// Compute volume level for real-time visualizer',
  `if (!firstPcmCaptured) {
          console.log("[7] PCM_CAPTURED");
          firstPcmCaptured = true;
        }
        if (micChunkCount < 5) {
          console.log(\`[PCM DEBUG] chunk #\${micChunkCount + 1} bytes=\${inputData.length}\`);
          micChunkCount++;
        }
        // Compute volume level for real-time visualizer`
);

code = code.replace(
  'wsRef.current.send(JSON.stringify({',
  `console.log("[8] PCM_SENT_TO_SERVER");
          wsRef.current.send(JSON.stringify({`
);

// 4. Browser WS Connected
code = code.replace(
  '// Keep it connecting until gemini_connected',
  `console.log("[4] BROWSER_WS_CONNECTED");
        // Keep it connecting until gemini_connected`
);

// 13. Audio Received in Browser
code = code.replace(
  "} else if (msg.type === 'audio_stream' && msg.audio) {",
  `} else if (msg.type === 'audio_stream' && msg.audio) {
            console.log("[13] AUDIO_RECEIVED_IN_BROWSER");
            console.log("bytes=", msg.audio.length, "mimeType=", msg.mimeType);`
);

// 14. PCM Decoded & 15. AudioBuffer Created & 16. Audio Source Started & RMS Analysis
const oldPlayAudioChunkStart = 'const playAudioChunk = (base64Audio: string, mimeType?: string) => {';
const newPlayAudioChunkStart = `const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    initOutputCtx();
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      const rateMatch = mimeType?.match(/rate=(\\d+)/);
      const incomingSampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      console.log("[VOICE DEBUG] PlayAudioChunk with sampleRate =", incomingSampleRate);

      console.log("[PCM PLAYBACK] base64 length =", base64Audio.length);
      const binary = atob(base64Audio);
      const len = binary.length;
      if (len % 2 !== 0) {
        console.error("[PCM DECODE ERROR] byteLength is not even!", len);
      }
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }
      
      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }

      console.log("[14] PCM_DECODED");
      console.log("samples =", float32Data.length);
      console.log("bytes =", len);
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      console.log("[15] AUDIOBUFFER_CREATED");
      console.log("channels =", audioBuffer.numberOfChannels);
      console.log("length =", audioBuffer.length);
      console.log("sampleRate =", audioBuffer.sampleRate);
      console.log("duration =", audioBuffer.duration);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Add AnalyserNode for Output RMS
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      const checkRMS = () => {
        const dataArray = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
          if (Math.abs(dataArray[i]) > peak) peak = Math.abs(dataArray[i]);
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        if (rms > 0.001) {
           console.log("[AUDIO OUTPUT DEBUG] rms =", rms.toFixed(5), "peak =", peak.toFixed(5));
        } else {
           // check again in a bit if it's still playing
           if (ctx.state === 'running') {
              setTimeout(checkRMS, 50);
           }
        }
      };
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime + 0.05) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      
      console.log("[16] AUDIO_SOURCE_STARTED");
      console.log("AudioContext.state =", ctx.state);
      source.start(nextStartTimeRef.current);
      setTimeout(checkRMS, 50);
      
      console.log("[VOICE DEBUG] Playback scheduled at", nextStartTimeRef.current, "currentTime", currentTime);
      nextStartTimeRef.current += audioBuffer.duration;
      
      activeNodesRef.current.push(source);
      
      source.onended = () => {
        activeNodesRef.current = activeNodesRef.current.filter(n => n !== source);
      };
    } catch (e) {
      console.error("[VOICE DEBUG] Error playing audio chunk:", e);
    }
  };`;

const playAudioChunkEnd = '} catch (e) {\n      console.error("[VOICE DEBUG] Error playing audio chunk:", e);\n    }\n  };';

const startIdx = code.indexOf(oldPlayAudioChunkStart);
const endIdx = code.indexOf(playAudioChunkEnd, startIdx) + playAudioChunkEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + newPlayAudioChunkStart + code.substring(endIdx);
} else {
    console.error("Could not replace playAudioChunk!");
}

// Add WS Close and Error logs
code = code.replace(
  "console.warn('VoiceDialog live WebSocket error:', err);",
  "console.log('[BROWSER WS] ERROR', err);\n        console.warn('VoiceDialog live WebSocket error:', err);"
);

code = code.replace(
  "ws.onclose = () => {",
  "ws.onclose = (e) => {\n        console.log('[BROWSER WS] CLOSED code=', e?.code, 'reason=', e?.reason);"
);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log("Patched VoiceDialog.tsx");
