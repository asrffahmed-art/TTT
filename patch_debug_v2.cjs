const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

content = content.replace(/const testSpeaker = \(\) => \{[\s\S]*?const startSession = async \(\) => \{/, 'const startSession = async () => {');

const testFunctions = `
  const testSpeaker = () => {
    console.log("=============================");
    console.log("[TEST SPEAKER]");
    initOutputCtx();
    const ctx = outputAudioCtxRef.current;
    if (!ctx) {
      console.log("AudioContext state = FAIL (Not Created)");
      return;
    }
    
    if (ctx.state === 'suspended') {
       ctx.resume();
    }

    console.log("AudioContext state =", ctx.state);
    console.log("AudioContext sampleRate =", ctx.sampleRate);
    console.log("destination channelCount =", ctx.destination.channelCount);
    console.log("destination maxChannelCount =", ctx.destination.maxChannelCount);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      
      osc.frequency.value = 440;
      gain.gain.value = 0.5;
      analyser.fftSize = 2048;

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start();
      console.log("Oscillator started = YES");
      console.log("Gain value =", gain.gain.value);

      setTimeout(() => {
        const dataArray = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          sumSquares += val * val;
          if (Math.abs(val) > peak) peak = Math.abs(val);
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        console.log("RMS =", rms);
        console.log("Peak =", peak);
        console.log("HEARD: YES/NO (Please verify)");
        console.log("=============================");
        
        osc.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.error(e);
      console.log("Oscillator started = FAIL");
    }
  };

  const testGeminiAudio = () => {
    console.log("=============================");
    console.log("[GEMINI TEST]");
    if (wsRef.current) wsRef.current.close();
    initOutputCtx();
    const ctx = outputAudioCtxRef.current;
    if (ctx && ctx.state === 'suspended') ctx.resume();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${protocol}//\${window.location.host}/api/live-audio?model=\${encodeURIComponent(selectedVoiceModel)}&voice=Aoede\`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket: OPEN");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'gemini_connected') {
        console.log("SESSION CONNECTED = PASS");
        ws.send(JSON.stringify({
          type: 'text',
          text: 'قل: مرحباً، هذا اختبار صوتي.'
        }));
        console.log("TEXT SENT = PASS");
      } else if (msg.type === 'audio_stream' && msg.audio) {
        console.log("MESSAGE RECEIVED = PASS");
        console.log("AUDIO PART FOUND = PASS");
        console.log("MIME TYPE =", msg.mimeType);
        
        try {
          const binary = atob(msg.audio);
          const len = binary.length;
          console.log("AUDIO BYTES =", len);

          const buffer = new ArrayBuffer(len);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
          
          const int16View = new Int16Array(buffer);
          const float32Data = new Float32Array(int16View.length);
          let sumSquares = 0;
          for (let i = 0; i < int16View.length; i++) {
            const val = int16View[i] / 32768.0;
            float32Data[i] = val;
            sumSquares += val * val;
          }
          const audioRms = Math.sqrt(sumSquares / float32Data.length);
          console.log("AUDIO RMS =", audioRms);
          
          console.log("-----------------------------");
          console.log("[GEMINI PLAYBACK]");
          console.log("PCM DECODE = PASS");
          
          if (!ctx) {
            console.log("AudioBuffer = FAIL (No Context)");
            return;
          }
          
          const sampleRate = getSampleRateFromMimeType(msg.mimeType);
          const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
          audioBuffer.getChannelData(0).set(float32Data);
          
          console.log("AudioBuffer = PASS");
          console.log("AudioBuffer sampleRate =", audioBuffer.sampleRate);
          console.log("AudioBuffer duration =", audioBuffer.duration.toFixed(3));
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          
          source.connect(analyser);
          analyser.connect(ctx.destination);
          
          source.start();
          console.log("Source.start = PASS");
          
          setTimeout(() => {
            const dataArray = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(dataArray);
            let outSum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              outSum += dataArray[i] * dataArray[i];
            }
            const outRms = Math.sqrt(outSum / dataArray.length);
            console.log("Output RMS =", outRms);
            console.log("HEARD: YES/NO (Please verify)");
            console.log("=============================");
          }, Math.min(audioBuffer.duration * 1000 / 2, 500)); // Measure in the middle of playback
          
        } catch (e) {
          console.error(e);
          console.log("PCM DECODE = FAIL");
        }
      }
    };
  };
`;

content = content.replace('const startSession = async () => {', testFunctions + '\n  const startSession = async () => {');
fs.writeFileSync('src/components/VoiceDialog.tsx', content);
