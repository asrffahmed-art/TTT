const fs = require('fs');

let client = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

const testSpeakerFn = `
  const testSpeaker = () => {
    console.log("[DEBUG] TEST BUTTON CLICK");
    console.log("[DEBUG] TEST TONE STARTED");
    initOutputCtx();
    const ctx = outputAudioCtxRef.current;
    if (!ctx) {
      console.log("NO AUDIO CONTEXT");
      return;
    }
    console.log("[DEBUG] AUDIO CONTEXT STATE =", ctx.state);
    console.log("[DEBUG] AUDIO CONTEXT SAMPLE RATE =", ctx.sampleRate);
    
    const osc = ctx.createOscillator();
    osc.frequency.value = 440;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };
`;

const testGeminiAudioFn = `
  const testGeminiAudio = () => {
    console.log("[DEBUG] TEST BUTTON CLICK");
    if (wsRef.current) {
        wsRef.current.close();
    }
    
    initOutputCtx();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${protocol}//\${window.location.host}/api/live-audio?model=\${encodeURIComponent(selectedVoiceModel)}&voice=Aoede\`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
        console.log("[DEBUG] WS CONNECTED FOR TEST");
    };
    
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'gemini_connected') {
            console.log("SESSION CONNECTED = YES");
            ws.send(JSON.stringify({
                type: 'text',
                text: 'مرحبا ثوث. رد علي بصوت قصير جدًا.'
            }));
            console.log("TEXT SENT = YES");
        } else if (msg.type === 'audio_stream' && msg.audio) {
            console.log("GEMINI MESSAGE = YES");
            console.log("GEMINI AUDIO BYTES = " + msg.audio.length);
            console.log("GEMINI MIME TYPE = " + msg.mimeType);
            
            try {
                const binary = atob(msg.audio);
                const len = binary.length;
                const buffer = new ArrayBuffer(len);
                const view = new Uint8Array(buffer);
                for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
                const int16View = new Int16Array(buffer);
                const float32Data = new Float32Array(int16View.length);
                let sumSquares = 0;
                let min = Infinity;
                let max = -Infinity;
                
                for (let i = 0; i < int16View.length; i++) {
                    const val = int16View[i] / 32768.0;
                    float32Data[i] = val;
                    sumSquares += val * val;
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
                
                const rms = Math.sqrt(sumSquares / float32Data.length);
                
                console.log("[DEBUG] GEMINI AUDIO ANALYSIS");
                console.log("bytes=" + len);
                console.log("samples=" + float32Data.length);
                console.log("min=" + min);
                console.log("max=" + max);
                console.log("rms=" + rms);
                console.log("GEMINI AUDIO RMS = " + rms);
                
                const ctx = outputAudioCtxRef.current;
                if (!ctx) return;
                const sampleRate = getSampleRateFromMimeType(msg.mimeType);
                const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
                audioBuffer.getChannelData(0).set(float32Data);
                console.log("AUDIOBUFFER = PASS");
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyser.connect(ctx.destination);
                
                source.start();
                console.log("AUDIO SOURCE STARTED = PASS");
                
                setTimeout(() => {
                    const dataArray = new Float32Array(analyser.fftSize);
                    analyser.getFloatTimeDomainData(dataArray);
                    let outSum = 0;
                    for (let i=0; i<dataArray.length; i++) {
                        outSum += dataArray[i] * dataArray[i];
                    }
                    const outRms = Math.sqrt(outSum / dataArray.length);
                    console.log("OUTPUT RMS = " + outRms);
                }, 100);
                
                console.log("PCM DECODE = PASS");
                
            } catch (err) {
                console.error(err);
                console.log("AUDIOBUFFER = FAIL");
                console.log("AUDIO SOURCE STARTED = FAIL");
                console.log("PCM DECODE = FAIL");
            }
        } else if (msg.type === 'error') {
            console.error("WS ERROR:", msg.error);
        }
    };
    
    ws.onclose = () => {
        console.log("[DEBUG] WS CLOSED");
    };
  };
`;

client = client.replace('const startSession = async () => {', testSpeakerFn + '\n' + testGeminiAudioFn + '\n  const startSession = async () => {');

// Add buttons
const buttonsHtml = `
      <div className="flex gap-2 justify-center mb-4 shrink-0 relative z-10">
        <button onClick={testGeminiAudio} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl text-xs">TEST GEMINI AUDIO</button>
        <button onClick={testSpeaker} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs">TEST SPEAKER</button>
      </div>
`;

client = client.replace('<div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">', 
  buttonsHtml + '\n      <div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">');

fs.writeFileSync('src/components/VoiceDialog.tsx', client);
