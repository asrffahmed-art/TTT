const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

content = content.replace(
  'console.log("[VOICE] USER CLICK");',
  'console.log("[VOICE 01] USER CLICK");'
);

content = content.replace(
  'console.log("[VOICE] OUTPUT CONTEXT READY");',
  'console.log("[VOICE 02] OUTPUT CONTEXT READY");'
);

content = content.replace(
  'console.log("[VOICE] MICROPHONE READY");',
  'console.log("[VOICE 07] MICROPHONE READY");'
);

content = content.replace(
  'console.log("[VOICE] WS CONNECTED");',
  'console.log("[VOICE 03] WS CONNECTING...");\n      console.log("[VOICE 04] WS CONNECTED");'
);

content = content.replace(
  'console.log("[VOICE] GEMINI SESSION CONNECTED");',
  'console.log("[VOICE 05] GEMINI CONNECTING...");\n            console.log("[VOICE 06] GEMINI CONNECTED");'
);

content = content.replace(
  'console.log("[VOICE] PCM SENT");',
  'console.log("[VOICE 09] PCM SENT TO SERVER");'
);

content = content.replace(
  'console.log("[VOICE] AUDIO STREAM RECEIVED");',
  'console.log("[VOICE 15] AUDIO STREAM RECEIVED");'
);

content = content.replace(
  'console.log("[VOICE] PLAYBACK FUNCTION CALLED");',
  'console.log("[VOICE 16] PLAYBACK FUNCTION CALLED");'
);

content = content.replace(
  'console.log("[VOICE] AUDIO BUFFER CREATED", audioBuffer.duration.toFixed(3));',
  'console.log("[VOICE 17] AUDIO BUFFER CREATED", audioBuffer.duration.toFixed(3));'
);

content = content.replace(
  'console.log("[VOICE] AUDIO SOURCE STARTED");',
  'console.log("[VOICE 18] AUDIO SOURCE STARTED");'
);

// Add detailed PCM logging
content = content.replace(
  '// Compute volume level for real-time visualizer',
  `// Compute volume level for real-time visualizer
        let min = 0; let max = 0; let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
          if (inputData[i] < min) min = inputData[i];
          if (inputData[i] > max) max = inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (micChunkCount === 2) {
            console.log("[VOICE 08] INPUT PCM CREATED (Chunk #2)");
            console.log("[VOICE MICROPHONE INFO]");
            console.log("bytes =", inputData.length * 4); // Float32
            console.log("samples =", inputData.length);
            console.log("actualRate =", actualRate);
            console.log("targetRate =", targetRate);
            console.log("rms =", rms.toFixed(4));
            console.log("min =", min.toFixed(4));
            console.log("max =", max.toFixed(4));
        }
`
);
content = content.replace(
  'let sum = 0;\n        for (let i = 0; i < inputData.length; i++) {\n          sum += inputData[i] * inputData[i];\n        }',
  '' // Already added in the block above
);

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
console.log('Detailed logs added.');
