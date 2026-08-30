const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. Remove old test functions
content = content.replace(/const testSpeaker = \(\) => \{[\s\S]*?const startSession = async \(\) => \{/, 'const startSession = async () => {');
content = content.replace(/const testGeminiAudio = \(\) => \{[\s\S]*?const startSession = async \(\) => \{/, 'const startSession = async () => {');

// 2. Insert new test functions
const testFunctions = `
  const runEnvDiagnostics = (ctx) => {
    console.log("=== BROWSER AUDIO DIAGNOSTICS ===");
    console.log("AudioContext state:", ctx.state);
    console.log("AudioContext sampleRate:", ctx.sampleRate);
    console.log("AudioContext baseLatency:", ctx.baseLatency);
    console.log("AudioContext outputLatency:", ctx.outputLatency);
    console.log("destination.channelCount:", ctx.destination.channelCount);
    console.log("destination.maxChannelCount:", ctx.destination.maxChannelCount);
    console.log("document.hidden:", document.hidden);
    console.log("document.visibilityState:", document.visibilityState);
    console.log("document.hasFocus():", document.hasFocus());
    console.log("navigator.userAgent:", navigator.userAgent);
    console.log("navigator.mediaDevices:", !!navigator.mediaDevices);
    
    const inIframe = window !== window.top;
    console.log("Inside iframe:", inIframe);
  };

  const testOscillator = () => {
    console.log("\\n--- 1. Oscillator → Speaker ---");
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      runEnvDiagnostics(ctx);
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();

      osc.frequency.value = 440;
      gain.gain.value = 0.5;
      analyser.fftSize = 256;

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start();
      console.log("STARTED = YES");

      setTimeout(() => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        let peak = 0;
        for (let i=0; i<data.length; i++) {
          sumSquares += data[i]*data[i];
          if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
        }
        console.log("RMS =", Math.sqrt(sumSquares/data.length));
        console.log("Peak =", peak);
        console.log("PASS/FAIL = " + (Math.sqrt(sumSquares/data.length) > 0 ? "PASS" : "FAIL"));
        console.log("HEARD: ??? (Wait for user)");
        osc.stop();
        console.log("ENDED = YES");
      }, 500);
    } catch (e) {
      console.error(e);
      console.log("ERROR =", e.message);
      console.log("PASS/FAIL = FAIL");
    }
  };

  const testAudioBuffer = () => {
    console.log("\\n--- 2. AudioBufferSource → Speaker ---");
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, sampleRate * 0.5, sampleRate); // 0.5 sec
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      source.start();
      console.log("STARTED = YES");

      setTimeout(() => {
        const fData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(fData);
        let sumSquares = 0;
        for (let i=0; i<fData.length; i++) sumSquares += fData[i]*fData[i];
        console.log("RMS =", Math.sqrt(sumSquares/fData.length));
        console.log("PASS/FAIL = " + (Math.sqrt(sumSquares/fData.length) > 0 ? "PASS" : "FAIL"));
        console.log("HEARD: ??? (Wait for user)");
      }, 250);

      source.onended = () => {
        console.log("ENDED = YES");
      };
    } catch (e) {
      console.error(e);
      console.log("ERROR =", e.message);
      console.log("PASS/FAIL = FAIL");
    }
  };

  const testHTMLAudioElement = () => {
    console.log("\\n--- 3. HTMLAudioElement ---");
    try {
      const sampleRate = 44100;
      const length = sampleRate * 0.5;
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);

      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);

      let offset = 44;
      for (let i = 0; i < length; i++) {
        const val = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.5;
        view.setInt16(offset, val < 0 ? val * 0x8000 : val * 0x7FFF, true);
        offset += 2;
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onplay = () => console.log("STARTED = YES");
      audio.onended = () => {
        console.log("ENDED = YES");
        console.log("PASS/FAIL = PASS");
        console.log("HEARD: ??? (Wait for user)");
      };
      audio.onerror = (e) => {
        console.log("ERROR =", audio.error);
        console.log("PASS/FAIL = FAIL");
      };

      audio.play().catch(e => {
        console.error(e);
        console.log("ERROR =", e.message);
        console.log("PASS/FAIL = FAIL");
      });

    } catch (e) {
      console.error(e);
      console.log("ERROR =", e.message);
      console.log("PASS/FAIL = FAIL");
    }
  };
`;
content = content.replace('const startSession = async () => {', testFunctions + '\n  const startSession = async () => {');

// 3. Replace the buttons
const oldButtons = /<div className="flex gap-2 justify-center mb-4 shrink-0 relative z-10">[\s\S]*?<\/div>/;
const oldButtons2 = /<div className="flex flex-wrap gap-2 justify-center mb-4 shrink-0 relative z-10" id="debug-buttons">[\s\S]*?<\/div>/;

const newButtons = `
      <div className="flex flex-wrap gap-2 justify-center mb-4 shrink-0 relative z-10" id="debug-buttons">
        <button onClick={testOscillator} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs">1. Oscillator</button>
        <button onClick={testAudioBuffer} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs">2. AudioBuffer</button>
        <button onClick={testHTMLAudioElement} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs">3. HTML Audio</button>
      </div>
`;

if (content.match(oldButtons)) {
    content = content.replace(oldButtons, newButtons);
} else if (content.match(oldButtons2)) {
    content = content.replace(oldButtons2, newButtons);
} else {
    const insertTarget = '<div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">';
    content = content.replace(insertTarget, newButtons + '\n      ' + insertTarget);
}

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
