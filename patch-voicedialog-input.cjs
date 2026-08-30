const fs = require('fs');

let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Replace the audioContext setup to add logs and resampler
const setupRegex = /      const AudioCtx = window\.AudioContext \|\| \(window as any\)\.webkitAudioContext;\s*const audioCtx = new AudioCtx\(\{ sampleRate: 16000 \}\);/g;
const newSetup = `      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      console.log("[VOICE DEBUG] Input AudioContext created");
      console.log("[VOICE DEBUG] Input AudioContext state =", audioCtx.state);
      console.log("[VOICE DEBUG] Input AudioContext actual sampleRate =", audioCtx.sampleRate);`;
code = code.replace(setupRegex, newSetup);

// Replace onaudioprocess
const startProcessIdx = code.indexOf('      scriptProcessor.onaudioprocess = (e) => {');
const endProcessIdx = code.indexOf('      // 3. Connect real-time WebSocket');

if (startProcessIdx !== -1 && endProcessIdx !== -1) {
  const newProcessLogic = `      // Manual resampler if browser ignores sampleRate: 16000
      const targetRate = 16000;
      let resampleRatio = 1;
      
      scriptProcessor.onaudioprocess = (e) => {
        if (!isSessionActiveRef.current) return;

        let inputData = e.inputBuffer.getChannelData(0);
        const actualRate = e.inputBuffer.sampleRate;
        
        // Resample if needed
        if (actualRate !== targetRate) {
           resampleRatio = actualRate / targetRate;
           const targetLength = Math.floor(inputData.length / resampleRatio);
           const resampled = new Float32Array(targetLength);
           for (let i = 0; i < targetLength; i++) {
              resampled[i] = inputData[Math.floor(i * resampleRatio)];
           }
           inputData = resampled;
        }

        // Compute volume level for real-time visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const currentVol = Math.min(100, Math.floor(rms * 400));
        setVolumeLevel(currentVol);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Convert to PCM16
          const pcmBuffer = new ArrayBuffer(inputData.length * 2);
          const view = new DataView(pcmBuffer);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          
          let binary = '';
          const bytes = new Uint8Array(pcmBuffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Audio = btoa(binary);

          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio
          }));
        }
      };

`;
  code = code.substring(0, startProcessIdx) + newProcessLogic + code.substring(endProcessIdx);
  fs.writeFileSync('src/components/VoiceDialog.tsx', code);
  console.log("Patched input audio processing");
} else {
  console.log("Could not find onaudioprocess bounds");
}
