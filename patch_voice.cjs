const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. Add missing refs
if (!content.includes('nextPlayTimeRef')) {
  content = content.replace(
    'const outputSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);',
    'const outputSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);\n  const nextPlayTimeRef = useRef<number>(0);\n  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);'
  );
}

// 2. Replace initOutputCtx
content = content.replace(
  /const initOutputCtx = \(\) => \{[\s\S]*?\}\s*if \(outputAudioCtxRef\.current\.state === 'suspended'\) \{[\s\S]*?\}\s*\};/m,
  `const initOutputCtx = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new AudioCtx();
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
        outputAudioCtxRef.current.resume();
    }
    console.log("[VOICE] OUTPUT CONTEXT READY");
  };`
);

// 3. Replace clearAudioQueue
content = content.replace(
  /const clearAudioQueue = \(\) => \{[\s\S]*?\}\s*\};/m,
  `const clearAudioQueue = () => {
    try {
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
        try { source.disconnect(); } catch(e) {}
      });
    } catch(e) {}
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    
    if (outputSourceNodeRef.current) {
      try {
        outputSourceNodeRef.current.stop();
      } catch (e) {}
      outputSourceNodeRef.current = null;
    }
  };`
);

// 4. Extract getSampleRateFromMimeType (keep it)

// 5. Replace playAudioChunk
const playAudioChunkStart = content.indexOf('const playAudioChunk = (base64Audio: string, mimeType?: string) => {');
const startSessionIndex = content.indexOf('const startSession = async () => {');
if (playAudioChunkStart > -1 && startSessionIndex > -1) {
    const playChunkNew = `const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    console.log("[VOICE] PLAYBACK FUNCTION CALLED");
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      const incomingSampleRate = getSampleRateFromMimeType(mimeType);
      const binary = atob(base64Audio);
      const len = binary.length;
      
      if (len % 2 !== 0) return;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
      
      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);
      console.log("[VOICE] AUDIO BUFFER CREATED", audioBuffer.duration.toFixed(3));
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      // Scheduling
      if (nextPlayTimeRef.current < ctx.currentTime) {
        nextPlayTimeRef.current = ctx.currentTime;
      }
      
      source.start(nextPlayTimeRef.current);
      console.log("[VOICE] AUDIO SOURCE STARTED");
      nextPlayTimeRef.current += audioBuffer.duration;
      
      outputSourceNodeRef.current = source;
      activeSourcesRef.current.push(source);
      
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };
    } catch(e: any) {
      console.error("[VOICE] ERROR IN PLAYBACK", e.message);
    }
  };

  `;
    content = content.slice(0, playAudioChunkStart) + playChunkNew + content.slice(startSessionIndex);
}

// 6. Update startSession logs
content = content.replace("console.log(\"[3] MICROPHONE_READY\");", "console.log(\"[3] MICROPHONE_READY\");\n      console.log(\"[VOICE] MICROPHONE READY\");");
if (!content.includes('[VOICE] USER CLICK')) {
  content = content.replace(
    "const startSession = async () => {",
    "const startSession = async () => {\n    console.log(\"[VOICE] USER CLICK\");"
  );
}

// 7. Update ws logic
content = content.replace(
  "console.log(\"[GEMINI] CONNECTED\");",
  "console.log(\"[GEMINI] CONNECTED\");\n            console.log(\"[VOICE] GEMINI SESSION CONNECTED\");"
);
content = content.replace(
  "console.log(\"[13] AUDIO_RECEIVED_IN_BROWSER\");",
  "console.log(\"[13] AUDIO_RECEIVED_IN_BROWSER\");\n            console.log(\"[VOICE] AUDIO STREAM RECEIVED\");"
);

// 8. Update sending audio logic
content = content.replace(
  "console.log(\"[9] WS_SEND_AUDIO bytes=\", audioBase64.length);",
  "console.log(\"[9] WS_SEND_AUDIO bytes=\", audioBase64.length);\n          console.log(\"[VOICE] PCM SENT\");"
);

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
console.log('VoiceDialog patched.');
