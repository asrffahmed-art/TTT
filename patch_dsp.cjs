const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

const filterCode = `
      const source = audioCtx.createMediaStreamSource(stream);
      
      // ----------------------------------------------------
      // DSP: Digital Signal Processing to filter noise
      // 1. Highpass filter to remove low-frequency rumble (e.g. wind, hums)
      const highpassFilter = audioCtx.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 250; // Cut off below 250Hz

      // 2. Lowpass filter to remove high-frequency hiss/noise
      const lowpassFilter = audioCtx.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 4000; // Cut off above 4000Hz (speech is mostly below 4k)

      // 3. Dynamics Compressor to normalize volume and reduce loud peaks
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -30;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      // Chain the nodes: source -> highpass -> lowpass -> compressor -> scriptProcessor
      source.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(compressor);
      // ----------------------------------------------------

      // Create ScriptProcessor
      const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      compressor.connect(scriptProcessor);
`;

code = code.replace(/const source = audioCtx.createMediaStreamSource\(stream\);[\s\S]*?scriptProcessorRef.current = scriptProcessor;/, filterCode);
fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log('DSP patched successfully');
