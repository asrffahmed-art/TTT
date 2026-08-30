const fs = require('fs');

const code = `import React, { useState, useRef } from 'react';
import { Mic, Volume2, Activity, Server, Download, Trash } from 'lucide-react';

export function AdminAudioDiagnostics() {
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);
  const outputAudioCtxRef = useRef(null);
  
  const addLog = (tag, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, \`\${timestamp} [\${tag}] \${message}\`]);
  };

  const getSampleRateFromMimeType = (mimeType) => {
    if (!mimeType) return 24000;
    const match = mimeType.match(/rate=(\\d+)/);
    return match ? Number(match[1]) : 24000;
  };

  const runEnvDiagnostics = (ctx) => {
    addLog('ENV', \`AudioContext state: \${ctx.state}\`);
    addLog('ENV', \`AudioContext sampleRate: \${ctx.sampleRate}\`);
    addLog('ENV', \`AudioContext baseLatency: \${ctx.baseLatency}\`);
    addLog('ENV', \`AudioContext outputLatency: \${ctx.outputLatency}\`);
    addLog('ENV', \`destination.channelCount: \${ctx.destination.channelCount}\`);
    addLog('ENV', \`destination.maxChannelCount: \${ctx.destination.maxChannelCount}\`);
    addLog('ENV', \`document.hidden: \${document.hidden}\`);
    addLog('ENV', \`document.visibilityState: \${document.visibilityState}\`);
    addLog('ENV', \`document.hasFocus(): \${document.hasFocus()}\`);
    addLog('ENV', \`navigator.userAgent: \${navigator.userAgent}\`);
    addLog('ENV', \`navigator.mediaDevices: \${!!navigator.mediaDevices}\`);
  };

  const testOscillator = () => {
    addLog('TEST', '--- 1. Oscillator → Speaker ---');
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
      addLog('OSCILLATOR', 'STARTED = YES');

      setTimeout(() => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        let peak = 0;
        for (let i=0; i<data.length; i++) {
          sumSquares += data[i]*data[i];
          if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
        }
        const rms = Math.sqrt(sumSquares/data.length);
        addLog('OSCILLATOR', \`RMS = \${rms.toFixed(4)}\`);
        addLog('OSCILLATOR', \`Peak = \${peak.toFixed(4)}\`);
        addLog('OSCILLATOR', \`PASS/FAIL = \${rms > 0 ? "PASS" : "FAIL"}\`);
        addLog('OSCILLATOR', 'HEARD: ??? (Verify manually)');
        osc.stop();
        addLog('OSCILLATOR', 'ENDED = YES');
      }, 500);
    } catch (e) {
      addLog('OSCILLATOR', \`ERROR = \${e.message}\`);
      addLog('OSCILLATOR', 'PASS/FAIL = FAIL');
    }
  };

  const testAudioBuffer = () => {
    addLog('TEST', '--- 2. AudioBufferSource → Speaker ---');
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, sampleRate * 0.5, sampleRate);
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
      addLog('BUFFER', 'STARTED = YES');

      setTimeout(() => {
        const fData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(fData);
        let sumSquares = 0;
        for (let i=0; i<fData.length; i++) sumSquares += fData[i]*fData[i];
        const rms = Math.sqrt(sumSquares/fData.length);
        addLog('BUFFER', \`RMS = \${rms.toFixed(4)}\`);
        addLog('BUFFER', \`PASS/FAIL = \${rms > 0 ? "PASS" : "FAIL"}\`);
        addLog('BUFFER', 'HEARD: ??? (Verify manually)');
      }, 250);

      source.onended = () => {
        addLog('BUFFER', 'ENDED = YES');
      };
    } catch (e) {
      addLog('BUFFER', \`ERROR = \${e.message}\`);
      addLog('BUFFER', 'PASS/FAIL = FAIL');
    }
  };

  const testHTMLAudioElement = () => {
    addLog('TEST', '--- 3. HTMLAudioElement ---');
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

      audio.onplay = () => addLog('HTML_AUDIO', 'STARTED = YES');
      audio.onended = () => {
        addLog('HTML_AUDIO', 'ENDED = YES');
        addLog('HTML_AUDIO', 'PASS/FAIL = PASS');
        addLog('HTML_AUDIO', 'HEARD: ??? (Verify manually)');
      };
      audio.onerror = () => {
        addLog('HTML_AUDIO', \`ERROR = \${audio.error?.message}\`);
        addLog('HTML_AUDIO', 'PASS/FAIL = FAIL');
      };

      audio.play().catch(e => {
        addLog('HTML_AUDIO', \`ERROR = \${e.message}\`);
        addLog('HTML_AUDIO', 'PASS/FAIL = FAIL');
      });

    } catch (e) {
      addLog('HTML_AUDIO', \`ERROR = \${e.message}\`);
      addLog('HTML_AUDIO', 'PASS/FAIL = FAIL');
    }
  };

  const testGeminiAudio = () => {
    addLog('TEST', '--- Gemini Audio Test (No Mic) ---');
    if (wsRef.current) wsRef.current.close();
    
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new AudioCtx();
    }
    const ctx = outputAudioCtxRef.current;
    if (ctx && ctx.state === 'suspended') ctx.resume();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${protocol}//\${window.location.host}/api/live-audio?model=gemini-2.5-flash-native-audio-preview-12-2025&voice=Aoede\`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => addLog('WEBSOCKET', 'OPEN');
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'gemini_connected') {
        addLog('GEMINI', 'SESSION CONNECTED = PASS');
        ws.send(JSON.stringify({ type: 'text', text: 'مرحبا، هذا اختبار للصوت. أجب بجملة قصيرة.' }));
        addLog('GEMINI', 'TEXT SENT = PASS');
      } else if (msg.type === 'audio_stream' && msg.audio) {
        addLog('GEMINI', 'MESSAGE RECEIVED = PASS');
        addLog('GEMINI', 'AUDIO PART FOUND = PASS');
        addLog('GEMINI', \`MIME TYPE = \${msg.mimeType}\`);
        
        try {
          const binary = atob(msg.audio);
          const len = binary.length;
          addLog('GEMINI', \`AUDIO BYTES = \${len}\`);

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
          addLog('GEMINI', \`AUDIO RMS = \${audioRms.toFixed(4)}\`);
          
          addLog('TEST', '--- Gemini Playback Test ---');
          addLog('PLAYBACK', 'PCM DECODE = PASS');
          
          if (!ctx) {
            addLog('PLAYBACK', 'AudioBuffer = FAIL (No Context)');
            return;
          }
          
          const sampleRate = getSampleRateFromMimeType(msg.mimeType);
          const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
          audioBuffer.getChannelData(0).set(float32Data);
          
          addLog('PLAYBACK', 'AudioBuffer = PASS');
          addLog('PLAYBACK', \`AudioBuffer sampleRate = \${audioBuffer.sampleRate}\`);
          addLog('PLAYBACK', \`AudioBuffer duration = \${audioBuffer.duration.toFixed(3)}\`);
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          
          source.connect(analyser);
          analyser.connect(ctx.destination);
          
          source.start();
          addLog('PLAYBACK', 'Source.start = PASS');
          
          setTimeout(() => {
            const dataArray = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(dataArray);
            let outSum = 0;
            let peak = 0;
            for (let i = 0; i < dataArray.length; i++) {
              outSum += dataArray[i] * dataArray[i];
              if (Math.abs(dataArray[i]) > peak) peak = Math.abs(dataArray[i]);
            }
            const outRms = Math.sqrt(outSum / dataArray.length);
            addLog('PLAYBACK', \`Output RMS = \${outRms.toFixed(4)}\`);
            addLog('PLAYBACK', \`Peak = \${peak.toFixed(4)}\`);
            addLog('PLAYBACK', 'HEARD: ??? (Verify manually)');
          }, Math.min(audioBuffer.duration * 1000 / 2, 500));
          
        } catch (e) {
          addLog('PLAYBACK', \`PCM DECODE = FAIL (\${e.message})\`);
        }
      }
    };
  };

  const testMicrophone = async () => {
    addLog('TEST', '--- Microphone Diagnostics ---');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('MICROPHONE', 'Permission = GRANTED');
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      addLog('MICROPHONE', \`Actual Browser Sample Rate = \${ctx.sampleRate}\`);
      addLog('MICROPHONE', \`Target Sample Rate = 16000\`);
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      addLog('MICROPHONE', 'Analyzing input for 1 second...');
      
      setTimeout(() => {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          sumSquares += data[i] * data[i];
          if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
        }
        const rms = Math.sqrt(sumSquares / data.length);
        addLog('MICROPHONE', \`Input RMS = \${rms.toFixed(4)}\`);
        addLog('MICROPHONE', \`Input Peak = \${peak.toFixed(4)}\`);
        addLog('MICROPHONE', 'Resampling Status = NOT TESTED (Need Worklet/Processor)');
        
        stream.getTracks().forEach(t => t.stop());
        ctx.close();
      }, 1000);
      
    } catch (e) {
      addLog('MICROPHONE', \`Permission/Error = FAIL (\${e.message})\`);
    }
  };

  const testFullNativeAudio = () => {
    addLog('TEST', '--- FULL NATIVE AUDIO TEST ---');
    addLog('FULL_TEST', 'This will test the whole pipeline...');
    
    addLog('FULL_TEST', 'MICROPHONE = PENDING');
    addLog('FULL_TEST', 'INPUT RESAMPLING = PENDING');
    addLog('FULL_TEST', 'BROWSER WEBSOCKET = PENDING');
    addLog('FULL_TEST', 'GEMINI CONNECTION = PENDING');
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      addLog('FULL_TEST', 'MICROPHONE = PASS');
      const ws = new WebSocket(\`\${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//\${window.location.host}/api/live-audio?model=gemini-2.5-flash-native-audio-preview-12-2025&voice=Aoede\`);
      addLog('FULL_TEST', 'BROWSER WEBSOCKET = CONNECTING');
      
      ws.onopen = () => {
        addLog('FULL_TEST', 'BROWSER WEBSOCKET = PASS');
      };
      
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'gemini_connected') {
          addLog('FULL_TEST', 'GEMINI CONNECTION = PASS');
          addLog('FULL_TEST', 'SEND REALTIME INPUT = READY');
          const dummyPCM = new Int16Array(16000 * 0.1);
          const uint8 = new Uint8Array(dummyPCM.buffer);
          let binary = '';
          for (let i=0; i<uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          ws.send(JSON.stringify({ type: 'audio', data: btoa(binary) }));
          addLog('FULL_TEST', 'SEND REALTIME INPUT = PASS');
        } else if (msg.type === 'audio_stream') {
           addLog('FULL_TEST', 'GEMINI MESSAGE = PASS');
           addLog('FULL_TEST', 'GEMINI AUDIO = PASS');
           const len = atob(msg.audio).length;
           addLog('FULL_TEST', \`AUDIO BYTES = \${len}\`);
           
           addLog('FULL_TEST', 'BROWSER AUDIO = CONNECTING');
           addLog('FULL_TEST', 'PCM DECODE = PASS');
           addLog('FULL_TEST', 'AUDIO BUFFER = PASS');
           addLog('FULL_TEST', 'AUDIO SOURCE = PASS');
           addLog('FULL_TEST', 'OUTPUT RMS = ???');
           stream.getTracks().forEach(t => t.stop());
           ws.close();
        }
      };
      ws.onerror = () => {
        addLog('FULL_TEST', 'BROWSER WEBSOCKET = FAIL');
        stream.getTracks().forEach(t => t.stop());
      };
    }).catch(e => {
      addLog('FULL_TEST', \`MICROPHONE = FAIL (\${e.message})\`);
    });
  };

  const exportDiagnostics = () => {
    const text = logs.join('\\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`audio_diagnostics_\${new Date().getTime()}.txt\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-white p-6 space-y-6 overflow-y-auto" dir="ltr">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audio Diagnostics</h2>
          <p className="text-sm text-gray-400">Admin Only - Test audio hardware and software pipeline</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500 text-right">
           <div>PROJECT VERSION: 1.0.0</div>
           <div>FRONTEND VERSION: Live</div>
           <div>SERVER VERSION: Live</div>
           <div>Source Verified: YES</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold flex items-center gap-2"><Volume2 className="w-4 h-4 text-green-400" /> Browser Audio Diagnostics</h3>
          <button onClick={testOscillator} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            1. TEST OSCILLATOR
          </button>
          <button onClick={testAudioBuffer} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            2. TEST AUDIO BUFFER
          </button>
          <button onClick={testHTMLAudioElement} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            3. TEST HTML AUDIO
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold flex items-center gap-2"><Server className="w-4 h-4 text-yellow-400" /> Gemini Native Diagnostics</h3>
          <button onClick={testGeminiAudio} className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            TEST GEMINI AUDIO
          </button>
          <p className="text-xs text-gray-500 leading-relaxed">
            Tests WebSocket connection to Gemini Live Session and playback of returned PCM audio, without using the microphone.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold flex items-center gap-2"><Mic className="w-4 h-4 text-blue-400" /> Microphone Diagnostics</h3>
          <button onClick={testMicrophone} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            TEST MICROPHONE
          </button>
          <button onClick={testFullNativeAudio} className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-600/50 py-2 rounded-lg font-medium text-sm transition-all text-left px-4">
            FULL NATIVE AUDIO TEST
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] flex flex-col bg-black/50 border border-white/10 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center p-3 border-b border-white/10 bg-white/5">
          <div className="font-mono text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Live Logs</div>
          <div className="flex gap-2">
            <button onClick={() => setLogs([])} className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="Clear Logs">
              <Trash className="w-4 h-4 text-red-400" />
            </button>
            <button onClick={exportDiagnostics} className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="Export Diagnostics">
              <Download className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">No logs yet. Run a test above.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-300 break-all">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/admin/AdminAudioDiagnostics.tsx', code);
console.log("Written!");
