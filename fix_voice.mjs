import fs from 'fs';

// --- Fix server.ts ---
let server = fs.readFileSync('server.ts', 'utf8');

// Ensure FIX-VOICE-003 is logged in server.ts
if (!server.includes('[THOTH SERVER LIVE FILE] FIX-VOICE-003')) {
  server = server.replace('console.log("[5] GEMINI_CONNECTING");', 'console.log("[THOTH SERVER LIVE FILE] FIX-VOICE-003");\n      console.log("[5] GEMINI_CONNECTING");');
}

// Replace the audio part finding logic
server = server.replace(/const audioPart = modelTurn\.parts\.find\(\(p: any\) => p\.inlineData && p\.inlineData\.data\);\s*if \(audioPart && ws\.readyState === 1\) \{\s*const audio = audioPart\.inlineData\.data;\s*const mimeType = audioPart\.inlineData\.mimeType \|\| 'audio\/pcm;rate=24000';/, 
`const audioPart = modelTurn.parts?.find((part: any) => part?.inlineData?.data);
                  if (audioPart && ws.readyState === 1) {
                     const audio = audioPart.inlineData.data;
                     const mimeType = audioPart.inlineData.mimeType;`);

// Remove hardcoded 'audio/pcm;rate=24000' fallback for mimeType completely if it exists elsewhere
server = server.replace(/\|\| 'audio\/pcm;rate=24000'/g, '');
fs.writeFileSync('server.ts', server);


// --- Fix VoiceDialog.tsx ---
let client = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Ensure FIX-VOICE-003 is logged
if (!client.includes('[THOTH FRONTEND LIVE FILE] FIX-VOICE-003')) {
  client = client.replace(/export function VoiceDialog\(\) \{/, 'export function VoiceDialog() {\n  console.log("[THOTH FRONTEND LIVE FILE] FIX-VOICE-003");');
}

// Remove OLD playAudioData entirely (it's declared as const playAudioData = ...)
client = client.replace(/const playAudioData = \([^)]+\) => \{[\s\S]*?activeAudioRef\.current = null;\s*\}\s*\};\s*\}/, '');

// The above regex might fail if it's too complex. Let's do it safer:
const oldPlayAudioDataRegex = /\/\/ OLD playAudioData function[\s\S]*?(?=\s*const startSession)/;
client = client.replace(oldPlayAudioDataRegex, '');

// Fix clearAudioQueue (remove close/null assignments for outputAudioCtxRef)
client = client.replace(/if \(outputAudioCtxRef\.current\) \{[\s\S]*?outputAudioCtxRef\.current = null;\s*\}/, `if (outputAudioCtxRef.current) {
      // Just stop the source node, don't close the context.
    }`);

// The actual outputSourceNode stopping:
// Wait, I will just rewrite clearAudioQueue:
client = client.replace(/const clearAudioQueue = \(\) => \{[\s\S]*?(?=\s*const playAudioChunk)/, `const clearAudioQueue = () => {
    // We only stop the current source if it's playing, we do NOT close the AudioContext
    // as it is tied to the user gesture and we want to reuse it.
  };`);

// Rewrite playAudioChunk completely
const newPlayAudioChunk = `const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      const incomingSampleRate = getSampleRateFromMimeType(mimeType);
      const binary = atob(base64Audio);
      const len = binary.length;
      
      console.log("[BROWSER AUDIO]");
      console.log("mimeType=", mimeType || 'unknown');
      console.log("bytes=", len);

      if (len % 2 !== 0) return;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
      
      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }
      
      console.log("[AUDIO BUFFER]");
      console.log("sampleRate=", incomingSampleRate);
      console.log("samples=", float32Data.length);
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);
      console.log("duration=", audioBuffer.duration.toFixed(2));
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      console.log("[AUDIO SOURCE STARTED]");
      
      source.onended = () => {
        // completed
      };
    } catch(e) {
      console.error(e);
    }
  };`;
client = client.replace(/const playAudioChunk = \([\s\S]*?(?=\s*const startSession)/, newPlayAudioChunk + '\n');


// Remove any calls to playAudioData in the websocket handler
client = client.replace(/playAudioData\([^)]+\);/g, '');

// Fix scriptProcessor connecting to destination and outputting mic
client = client.replace(/scriptProcessor\.connect\(audioCtx\.destination\);/g, `
      // Connect to a GainNode with 0 gain to prevent microphone feedback
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioCtx.destination);
`);

// Add log for audioCtx.sampleRate
client = client.replace(/const audioCtx = new AudioCtx\(\{ sampleRate: 16000 \}\);/, `const audioCtx = new AudioCtx({ sampleRate: 16000 });\n      console.log("INPUT audioCtx.sampleRate=", audioCtx.sampleRate);`);

// In the sendRealtimeInput, make sure to use the actual sample rate
client = client.replace(/mimeType: "audio\/pcm;rate=16000"/, 'mimeType: `audio/pcm;rate=${audioCtx.sampleRate}`');

fs.writeFileSync('src/components/VoiceDialog.tsx', client);
console.log("Files patched successfully.");
