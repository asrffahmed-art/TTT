const fs = require('fs');

// --- Patch VoiceDialog.tsx ---
let voice = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Test Button Setup
const testBtnOld = 'console.log("[VOICE TEST] SENDING TEXT TO WS");';
const testBtnNew = `console.log("[VOICE TEST 03] TEXT TEST CLICKED");
    console.log("[VOICE TEST 04] TEXT SENT");`;
voice = voice.replace(testBtnOld, testBtnNew);

// Session Created
voice = voice.replace('console.log("[VOICE 01] USER CLICK");', 'console.log("[VOICE TEST 01] SESSION CREATED");\n    console.log("[VOICE 01] USER CLICK");');

// Gemini Connected
voice = voice.replace('console.log("[VOICE 06] GEMINI CONNECTED");', 'console.log("[VOICE 06] GEMINI CONNECTED");\n            console.log("[VOICE TEST 02] GEMINI CONNECTED");');

// Message / Audio Received
voice = voice.replace('console.log("[VOICE 15] AUDIO STREAM RECEIVED");', 'console.log("[VOICE 15] AUDIO STREAM RECEIVED");\n            console.log("[VOICE TEST 05] GEMINI MESSAGE RECEIVED");');

// Audio Found & Playback
const playFuncCall = 'console.log("[VOICE 16] PLAYBACK FUNCTION CALLED");';
const playFuncNew = `console.log("[VOICE 16] PLAYBACK FUNCTION CALLED");
    console.log("[VOICE TEST 06] AUDIO FOUND");`;
voice = voice.replace(playFuncCall, playFuncNew);

const playAudioChunkStart = voice.indexOf('const playAudioChunk = (base64Audio: string, mimeType?: string) => {');
const playAudioChunkEnd = voice.indexOf('const startSession = async () => {');
if (playAudioChunkStart > -1 && playAudioChunkEnd > -1) {
    let playFn = voice.slice(playAudioChunkStart, playAudioChunkEnd);
    if (!playFn.includes('let playSumSquares = 0;')) {
        playFn = playFn.replace('audioBuffer.getChannelData(0).set(float32Data);', 
        `audioBuffer.getChannelData(0).set(float32Data);
      let playSumSquares = 0;
      for (let i = 0; i < float32Data.length; i++) {
         playSumSquares += float32Data[i] * float32Data[i];
      }
      const playRms = Math.sqrt(playSumSquares / float32Data.length);
      console.log("mimeType =", mimeType || "unknown");
      console.log("bytes =", len);
      console.log("rms =", playRms.toFixed(4));
      `);
      voice = voice.slice(0, playAudioChunkStart) + playFn + voice.slice(playAudioChunkEnd);
    }
}

// Audio Source Started
voice = voice.replace('console.log("[VOICE 18] AUDIO SOURCE STARTED");', 'console.log("[VOICE 18] AUDIO SOURCE STARTED");\n      console.log("[VOICE TEST 07] AUDIO SOURCE STARTED");');

// Microphone Logs
voice = voice.replace(
  'const stream = await navigator.mediaDevices.getUserMedia(',
  'console.log("[VOICE MIC 01] PERMISSION REQUEST");\n      const stream = await navigator.mediaDevices.getUserMedia('
);

voice = voice.replace('console.log("[VOICE 07] MICROPHONE READY");', 'console.log("[VOICE 07] MICROPHONE READY");\n      console.log("[VOICE MIC 02] TRACK READY");');

voice = voice.replace('console.log("INPUT audioCtx.sampleRate=", audioCtx.sampleRate);', 'console.log("INPUT audioCtx.sampleRate=", audioCtx.sampleRate);\n      console.log("[VOICE MIC 03] ACTUAL SAMPLE RATE =", audioCtx.sampleRate);');

// PCM Audio Process
const onaudioProcessStart = voice.indexOf('scriptProcessor.onaudioprocess = (e) => {');
const onaudioProcessEnd = voice.indexOf('} catch (err: any) {', onaudioProcessStart);
if (onaudioProcessStart > -1 && onaudioProcessEnd > -1) {
    let p = voice.slice(onaudioProcessStart, onaudioProcessEnd);
    // Replace the old detailed logging with the new requested one
    p = `scriptProcessor.onaudioprocess = (e) => {
        if (!isSessionActiveRef.current) return;
        let inputData = e.inputBuffer.getChannelData(0);
        const actualRate = e.inputBuffer.sampleRate;
        
        let inputSum = 0;
        let inputMin = 0;
        let inputMax = 0;
        for (let i = 0; i < inputData.length; i++) {
            inputSum += inputData[i] * inputData[i];
            if (inputData[i] < inputMin) inputMin = inputData[i];
            if (inputData[i] > inputMax) inputMax = inputData[i];
        }
        const inputRms = Math.sqrt(inputSum / inputData.length);

        if (micChunkCount < 5) {
            console.log("[VOICE MIC 04] PCM CHUNK");
            console.log("bytes =", inputData.length * 4);
            console.log("samples =", inputData.length);
            console.log("rms =", inputRms.toFixed(4));
            console.log("min =", inputMin.toFixed(4));
            console.log("max =", inputMax.toFixed(4));
            
            console.log("INPUT RATE =", actualRate);
            console.log("INPUT SAMPLES =", inputData.length);
            console.log("INPUT RMS =", inputRms.toFixed(4));
        }

        // Resample
        let resampledData = inputData;
        const targetRate = 16000;
        if (actualRate !== targetRate) {
           const resampleRatio = actualRate / targetRate;
           const targetLength = Math.floor(inputData.length / resampleRatio);
           resampledData = new Float32Array(targetLength);
           for (let i = 0; i < targetLength; i++) {
              resampledData[i] = inputData[Math.floor(i * resampleRatio)];
           }
        }
        
        let outputSum = 0;
        for (let i = 0; i < resampledData.length; i++) {
            outputSum += resampledData[i] * resampledData[i];
        }
        const outputRms = Math.sqrt(outputSum / resampledData.length);

        if (micChunkCount < 5) {
            console.log("OUTPUT RATE = 16000");
            console.log("OUTPUT SAMPLES =", resampledData.length);
            console.log("OUTPUT RMS =", outputRms.toFixed(4));
        }
        
        const currentVol = Math.min(100, Math.floor(outputRms * 400));
        setVolumeLevel(currentVol);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const pcmBuffer = new ArrayBuffer(resampledData.length * 2);
            const view = new DataView(pcmBuffer);
            let pcmMin = 0; let pcmMax = 0; let pcmSum = 0;
            for (let i = 0; i < resampledData.length; i++) {
                let s = Math.max(-1, Math.min(1, resampledData[i]));
                let intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
                view.setInt16(i * 2, intVal, true);
                if (intVal < pcmMin) pcmMin = intVal;
                if (intVal > pcmMax) pcmMax = intVal;
                pcmSum += (intVal/32768) * (intVal/32768);
            }
            const pcmRms = Math.sqrt(pcmSum / resampledData.length);
            
            if (micChunkCount < 5) {
                console.log("PCM16 BYTES =", pcmBuffer.byteLength);
                console.log("PCM16 RMS =", pcmRms.toFixed(4));
                console.log("PCM16 MIN =", pcmMin);
                console.log("PCM16 MAX =", pcmMax);
            }
            
            micChunkCount++;

            let binary = '';
            const bytes = new Uint8Array(pcmBuffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);

            if (micChunkCount < 6) {
                console.log(\`[VOICE SERVER SEND] PCM #\${micChunkCount}\`);
            }
            
            wsRef.current.send(JSON.stringify({
                type: 'audio',
                data: base64Audio,
                sequence: micChunkCount
            }));
        }
      };
      `;
    voice = voice.slice(0, onaudioProcessStart) + p + voice.slice(onaudioProcessEnd);
}

// Ensure micChunkCount exists
if (!voice.includes('let micChunkCount = 0;')) {
    voice = voice.replace('scriptProcessorRef.current = scriptProcessor;', 'scriptProcessorRef.current = scriptProcessor;\n      let micChunkCount = 0;');
}

// ACK processing
voice = voice.replace('console.log("[VOICE 10] SERVER ACK / PCM RECEIVED", msg.sequence);', 'console.log(`[VOICE PCM ACK] #${msg.sequence}`);');

fs.writeFileSync('src/components/VoiceDialog.tsx', voice);

// --- Patch server.ts ---
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace('let pcmSequence = 0;', ''); // clean previous global

const targetAudio = `if (msg.type === "audio" && msg.data) {`;
const replaceAudio = `if (msg.type === "audio" && msg.data) {
            const seq = msg.sequence || 1;
            if (seq < 6) {
                console.log(\`[VOICE SERVER RECEIVE] PCM #\${seq}\`);
            }
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'pcm_ack', sequence: seq }));
            }
            
            try {
              const binary = atob(msg.data);
              const len = binary.length;
              const buffer = new ArrayBuffer(len);
              const view = new Uint8Array(buffer);
              for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
              const int16View = new Int16Array(buffer);
              let sumSquares = 0;
              for (let i = 0; i < int16View.length; i++) {
                 const s = int16View[i]/32768;
                 sumSquares += s * s;
              }
              const rms = Math.sqrt(sumSquares / int16View.length);
              if (seq < 6) {
                  console.log("[GEMINI INPUT]");
                  console.log("bytes =", len);
                  console.log("mimeType = audio/pcm;rate=16000");
                  console.log("sampleRate = 16000");
                  console.log("rms =", rms.toFixed(4));
              }
            } catch(e){}

            await session.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            });
            if (seq < 6) {
                console.log("[GEMINI INPUT SENT]");
            }
`;
if (server.includes('await session.sendRealtimeInput({')) {
   // I need to be careful to properly replace it.
   // Let's just do it directly.
   const sendAudioRegex = /if \(msg\.type === "audio" && msg\.data\) \{[\s\S]*?await session\.sendRealtimeInput\(\{[\s\S]*?\}\);[\s\S]*?\}/m;
   
   let newSendAudio = `if (msg.type === "audio" && msg.data) {
            const seq = msg.sequence || 1;
            if (seq < 6) {
                console.log(\`[VOICE SERVER RECEIVE] PCM #\${seq}\`);
            }
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'pcm_ack', sequence: seq }));
            }
            
            try {
              const binary = atob(msg.data);
              const len = binary.length;
              const buffer = new ArrayBuffer(len);
              const view = new Uint8Array(buffer);
              for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
              const int16View = new Int16Array(buffer);
              let sumSquares = 0;
              for (let i = 0; i < int16View.length; i++) {
                 const s = int16View[i]/32768;
                 sumSquares += s * s;
              }
              const rms = Math.sqrt(sumSquares / int16View.length);
              if (seq < 6) {
                  console.log("[GEMINI INPUT]");
                  console.log("bytes =", len);
                  console.log("mimeType = audio/pcm;rate=16000");
                  console.log("sampleRate = 16000");
                  console.log("rms =", rms.toFixed(4));
              }
            } catch(e){}

            await session.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            });
            if (seq < 6) {
                console.log("[GEMINI INPUT SENT]");
            }
          }`;
   server = server.replace(sendAudioRegex, newSendAudio);
}

fs.writeFileSync('server.ts', server);
