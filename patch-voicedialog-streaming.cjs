const fs = require('fs');

let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. replace initOutputCtx and clearAudioQueue and playAudioChunk
const startRefIdx = code.indexOf('const outputAudioCtxRef = useRef<AudioContext | null>(null);');
const endRefIdx = code.indexOf('const playAudioData = (base64Audio: string');

const newAudioSystem = `  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const initOutputCtx = () => {
    if (!outputAudioCtxRef.current) {
      console.log("[VOICE DEBUG] Start button clicked, creating output AudioContext");
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioCtxRef.current = new AudioCtx(); // let browser pick default rate
      console.log("[VOICE DEBUG] Output AudioContext state =", outputAudioCtxRef.current.state);
      console.log("[VOICE DEBUG] Output AudioContext sampleRate =", outputAudioCtxRef.current.sampleRate);
      nextStartTimeRef.current = 0;
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
      outputAudioCtxRef.current.resume();
      console.log("[VOICE DEBUG] Resumed output AudioContext");
    }
  };

  const clearAudioQueue = () => {
    console.log("[VOICE DEBUG] Clearing audio queue (Interruption)");
    activeNodesRef.current.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    activeNodesRef.current = [];
    nextStartTimeRef.current = 0;
  };

  const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    initOutputCtx();
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      const rateMatch = mimeType?.match(/rate=(\\d+)/);
      const incomingSampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      console.log("[VOICE DEBUG] PlayAudioChunk with sampleRate =", incomingSampleRate);

      const binary = atob(base64Audio);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }
      
      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime + 0.05) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      source.start(nextStartTimeRef.current);
      console.log("[VOICE DEBUG] Playback scheduled at", nextStartTimeRef.current, "currentTime", currentTime);
      nextStartTimeRef.current += audioBuffer.duration;
      
      activeNodesRef.current.push(source);
      
      source.onended = () => {
        activeNodesRef.current = activeNodesRef.current.filter(n => n !== source);
      };
    } catch (e) {
      console.error("[VOICE DEBUG] Error playing audio chunk:", e);
    }
  };

  `;

code = code.substring(0, startRefIdx) + newAudioSystem + code.substring(endRefIdx);

// Fix ws.onmessage handling of audio_stream
const oldOnMessageStream = `          } else if (msg.type === 'audio_stream' && msg.audio) {
            setVoiceState('speaking');
            playAudioChunk(msg.audio);`;
const newOnMessageStream = `          } else if (msg.type === 'audio_stream' && msg.audio) {
            setVoiceState('speaking');
            playAudioChunk(msg.audio, msg.mimeType);`;
code = code.replace(oldOnMessageStream, newOnMessageStream);

// There is a duplicate audio_stream block in the code, let's fix that one too if it exists
const oldOnMessageStream2 = `          } else if (msg.type === 'audio_stream' && msg.audio) {
            setVoiceState('speaking');
            playAudioChunk(msg.audio);`;
code = code.replace(oldOnMessageStream2, newOnMessageStream);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log("Patched audio output system successfully");
