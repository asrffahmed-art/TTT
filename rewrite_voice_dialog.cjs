const fs = require('fs');

const code = `import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Loader2, Volume2, Sparkles, User, Send } from 'lucide-react';
import { useAppTheme } from '../lib/themeService';
import { auth } from '../lib/firebase';

export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export function VoiceDialog() {
  const theme = useAppTheme();
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<'gemini-3.1-flash-lite' | 'gemini-db-model' | 'gemini-2.5-flash-native-audio-preview-12-2025'>('gemini-2.5-flash-native-audio-preview-12-2025');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'مرحباً بك في المحادثة الصوتية المباشرة THOTH! يتم استقبال وبث الصوت الخام من المتصفح إلى موديل Gemini مباشرة بدون وسيط.',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 3.1 Flash Lite'
    }
  ]);
  const [inputText, setInputText] = useState('');

  // MediaStream and WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; text: string }[]>([]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const getSampleRateFromMimeType = (mimeType?: string): number => {
    if (!mimeType) return 24000;
    const match = mimeType.match(/rate=(\\d+)/);
    return match ? Number(match[1]) : 24000;
  };

  // OLD playAudioData function - KEEP for backward compatibility if needed by older text-based routes, but NEVER call in native path
  const playAudioData = (base64Audio: string, mimeType: string = 'audio/wav') => {
    if (!isSessionActiveRef.current) return;
    
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch (e) {}
      activeAudioRef.current = null;
    }

    setVoiceState('speaking');
    try {
      const audio = new Audio(\`data:\${mimeType};base64,\${base64Audio}\`);
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        }
      };

      audio.onerror = () => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        }
      };

      audio.play().catch(() => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        }
      });
    } catch (err) {
      activeAudioRef.current = null;
      if (isSessionActiveRef.current) {
        setVoiceState('listening');
      }
    }
  };

  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const initOutputCtx = () => {
    if (!outputAudioCtxRef.current) {
      console.log("[1] USER_CLICK");
      console.log("[VOICE] START");
      console.log("[VOICE DEBUG] Start button clicked, creating output AudioContext");
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioCtxRef.current = new AudioCtx(); 
      
      console.log("[2] AUDIO_CONTEXT_READY");
      console.log("[VOICE] OUTPUT_CTX state=", outputAudioCtxRef.current.state);
      console.log("[VOICE] OUTPUT_CTX sampleRate=", outputAudioCtxRef.current.sampleRate);
      nextStartTimeRef.current = 0;

      // Play Test Tone
      try {
        const osc = outputAudioCtxRef.current.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, outputAudioCtxRef.current.currentTime);
        osc.connect(outputAudioCtxRef.current.destination);
        osc.start();
        osc.stop(outputAudioCtxRef.current.currentTime + 0.5);
        console.log("[TEST TONE] Playing 440Hz sine wave for 0.5s");
      } catch (e) {
        console.error("[TEST TONE ERROR]", e);
      }
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
      outputAudioCtxRef.current.resume();
      console.log("[VOICE DEBUG] Resumed output AudioContext");
    }
  };

  const clearAudioQueue = () => {
    console.log("[VOICE DEBUG] Clearing audio queue (Interruption)");
    for (const source of activeSourcesRef.current) {
      try { source.stop(); } catch(e) {}
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    // NEVER CLOSE AudioContext HERE!
  };

  const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    
    try {
      const incomingSampleRate = getSampleRateFromMimeType(mimeType);
      console.log("[VOICE] AUDIO RECEIVED");
      console.log("[VOICE] AUDIO SAMPLE RATE=", incomingSampleRate);
      
      const binary = atob(base64Audio);
      const len = binary.length;
      
      if (len % 2 !== 0) {
        console.error("[PCM DECODE ERROR] byteLength is not even!", len);
        return;
      }
      
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }
      
      // Calculate min, max, RMS for received chunk (sanity check)
      const int16View = new Int16Array(buffer);
      let sumSquares = 0, peak = 0, min = 0, max = 0;
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        const s = int16View[i];
        sumSquares += s * s;
        if (Math.abs(s) > peak) peak = Math.abs(s);
        if (s < min) min = s;
        if (s > max) max = s;
        float32Data[i] = s / 32768.0;
      }
      const rawRms = Math.sqrt(sumSquares / int16View.length);
      console.log("[GEMINI AUDIO ANALYSIS]");
      console.log("samples =", int16View.length);
      console.log("min =", min);
      console.log("max =", max);
      console.log("rms =", rawRms.toFixed(2));

      console.log("[14] PCM_DECODED");
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      console.log("[15] AUDIOBUFFER_CREATED");
      console.log("[VOICE] AUDIO BUFFER CREATED");
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Add AnalyserNode for Output RMS
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      const checkRMS = () => {
        if (!isSessionActiveRef.current) return;
        const dataArray = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(dataArray);
        let ss = 0;
        let p = 0;
        for (let i = 0; i < dataArray.length; i++) {
          ss += dataArray[i] * dataArray[i];
          if (Math.abs(dataArray[i]) > p) p = Math.abs(dataArray[i]);
        }
        const rms = Math.sqrt(ss / dataArray.length);
        if (rms > 0.001) {
           console.log("[AUDIO OUTPUT DEBUG] rms =", rms.toFixed(5), "peak =", p.toFixed(5));
        } else {
           if (ctx.state === 'running' && activeSourcesRef.current.has(source)) {
              setTimeout(checkRMS, 50);
           }
        }
      };
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime + 0.05) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      
      console.log("[16] AUDIO_SOURCE_STARTED");
      console.log("[VOICE] AUDIO SOURCE STARTED");
      source.start(nextStartTimeRef.current);
      setTimeout(checkRMS, 50);
      
      nextStartTimeRef.current += audioBuffer.duration;
      
      activeSourcesRef.current.add(source);
      
      source.onended = () => {
        activeSourcesRef.current.delete(source);
      };
    } catch (e) {
      console.error("[VOICE DEBUG] Error playing audio chunk:", e);
    }
  };

  const startSession = async () => {
    setErrorMessage(null);
    stopSession();
    isSessionActiveRef.current = true;
    initOutputCtx();
    setVoiceState('connecting');

    try {
      // 1. Get raw microphone MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!isSessionActiveRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      console.log("[3] MICROPHONE_READY");

      // 2. Setup AudioContext and ScriptProcessor for streaming raw PCM to Gemini
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      console.log("[VOICE DEBUG] Input AudioContext created");
      console.log("[VOICE] INPUT_CTX sampleRate=", audioCtx.sampleRate);
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      // Keep mic output silenced
      const silentGainNode = audioCtx.createGain();
      silentGainNode.gain.value = 0;
      scriptProcessor.connect(silentGainNode);
      silentGainNode.connect(audioCtx.destination);
      source.connect(scriptProcessor);

      // 3. Connect real-time WebSocket to stream raw audio directly to Gemini
      const preferredVoice = localStorage.getItem('thoth_selected_voice') || 'Aoede';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = \`\${protocol}//\${window.location.host}/api/live-audio?model=\${encodeURIComponent(selectedVoiceModel)}&voice=\${encodeURIComponent(preferredVoice)}\`;
      
      console.log("[4] BROWSER_WS_CONNECTED");
      console.log("[VOICE] WS CONNECTED");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSessionActiveRef.current) return;
      };

      ws.onmessage = (event) => {
        if (!isSessionActiveRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'gemini_connected') {
            console.log("[GEMINI] CONNECTED");
            setVoiceState('listening');
          } else if (msg.type === 'state') {
            if (msg.state === 'thinking') {
              setVoiceState('thinking');
            }
          } else if (msg.type === 'audio_stream' && msg.audio) {
            console.log("[13] AUDIO_RECEIVED_IN_BROWSER");
            console.log("[GEMINI] AUDIO RECEIVED");
            console.log("[GEMINI] AUDIO MIME=", msg.mimeType);
            console.log("[GEMINI] AUDIO BYTES=", msg.audio.length);
            setVoiceState('speaking');
            playAudioChunk(msg.audio, msg.mimeType);
          } else if (msg.type === 'interrupted') {
            clearAudioQueue();
            setVoiceState('listening');
          } else if (msg.type === 'turn_complete') {
            setVoiceState('listening');
          } else if (msg.type === 'output_text') {
            if (msg.text) {
              const aiMsg: VoiceMessage = {
                id: Date.now().toString(),
                sender: 'ai',
                text: msg.text,
                timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                modelUsed: selectedVoiceModel === 'gemini-db-model' ? 'Gemini Database Audio (مخصص)' : 'Gemini Native Audio'
              };
              setMessages(prev => [...prev, aiMsg]);
              historyRef.current.push({ role: 'model', text: msg.text });
            }
            if (msg.audio) {
              playAudioData(msg.audio, 'audio/wav');
            }
          } else if (msg.type === 'audio' && msg.data) {
            playAudioData(msg.data, 'audio/wav');
          } else if (msg.type === 'error') {
            setErrorMessage(msg.error || 'حدث خطأ في استقبال الصوت المباشر.');
            setVoiceState('error');
          }
        } catch (e) {
          console.error('Error parsing live ws data in VoiceDialog:', e);
        }
      };

      ws.onerror = (err) => {
        console.log('[BROWSER WS] ERROR', err);
      };

      ws.onclose = (e) => {
        console.log('[BROWSER WS] CLOSED code=', e?.code, 'reason=', e?.reason);
        if (isSessionActiveRef.current && voiceState !== 'error') {
          setVoiceState('disconnected');
        }
      };

      // 4. Stream raw PCM audio chunks continuously
      const targetRate = 16000;
      let resampleRatio = 1;
      let micChunkCount = 0;
      let firstPcmCaptured = false;
      
      scriptProcessor.onaudioprocess = (e) => {
        if (!isSessionActiveRef.current) return;

        let inputData = e.inputBuffer.getChannelData(0);
        const actualRate = e.inputBuffer.sampleRate;
        
        if (!firstPcmCaptured) {
          console.log("[7] PCM_CAPTURED");
          firstPcmCaptured = true;
        }
        if (micChunkCount < 5) {
          console.log(\`[PCM DEBUG] chunk #\${micChunkCount + 1} bytes=\${inputData.length}\`);
          micChunkCount++;
        }

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

          if (micChunkCount === 1) {
            console.log("[8] PCM_SENT_TO_SERVER");
            console.log("[VOICE] PCM SENT");
          }
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio
          }));
        }
      };
    } catch (err: any) {
      console.warn('Microphone error in VoiceDialog:', err);
      let msg = 'تعذر الوصول للميكروفون.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'تم رفض إذن الميكروفون. يرجى تفعيله من إعدادات المتصفح.';
      }
      setErrorMessage(msg);
      setVoiceState('error');
      isSessionActiveRef.current = false;
    }
  };

  const stopSession = () => {
    isSessionActiveRef.current = false;
    clearAudioQueue();
    
    // ONLY CLOSE AUDIO CONTEXT HERE
    if (outputAudioCtxRef.current) {
       try { outputAudioCtxRef.current.close(); } catch(e) {}
       outputAudioCtxRef.current = null;
    }

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch (e) {}
      activeAudioRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current && audioContextRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    setVoiceState('disconnected');
    setVolumeLevel(0);
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'connecting': return 'جاري الاتصال...';
      case 'listening': return 'يتحدث الآن...';
      case 'thinking': return 'يفكر...';
      case 'speaking': return 'THOTH يتحدث...';
      case 'error': return 'حدث خطأ';
      default: return 'انقر للبدء بالمحادثة';
    }
  };

  const handleSendText = (textOverride?: string) => {
    const textToSend = textOverride || inputText.trim();
    if (!textToSend || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const userMsg: VoiceMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    historyRef.current.push({ role: 'user', text: textToSend });
    
    wsRef.current.send(JSON.stringify({ type: 'text', text: textToSend }));
    if (!textOverride) setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] p-4 font-sans text-right relative selection:bg-indigo-500/30 overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 relative z-10">
        <div>
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-white to-white/70">
            البث المباشر (Native Audio)
          </h2>
          <p className="text-white/40 text-[11px] font-medium mt-1">تحدث واستمع لـ THOTH بتزامن حيّ بلا انتظار</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 mb-4 rounded-2xl bg-white/5 border border-white/10 shrink-0 w-fit self-center">
        <button
          onClick={() => {
            setSelectedVoiceModel('gemini-2.5-flash-native-audio-preview-12-2025');
            if (voiceState !== 'disconnected') {
              stopSession();
            }
          }}
          className={\`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all \${
            selectedVoiceModel === 'gemini-2.5-flash-native-audio-preview-12-2025'
              ? \`bg-gradient-to-r \${theme.btnPrimary} shadow-lg shadow-indigo-500/20\`
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }\`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Native Audio (استجابة حية)</span>
        </button>
      </div>

      {errorMessage && voiceState === 'error' && (
        <div className="flex items-center gap-3 p-3.5 mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="flex-1">{errorMessage}</p>
          <button
            onClick={startSession}
            className="px-3 py-1 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all text-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">
        <div className={\`absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 \${theme.ambientLight1} blur-3xl pointer-events-none rounded-full\`} />
        
        <div className="relative flex items-center justify-center mb-4">
          <div className={\`w-32 h-32 rounded-full bg-gradient-to-tr \${theme.previewGradient} blur-2xl transition-all duration-300 \${
            voiceState === 'listening' ? 'scale-125 opacity-100 animate-pulse' : voiceState === 'speaking' ? 'scale-110 opacity-90' : voiceState === 'thinking' ? 'scale-110 opacity-80 animate-spin' : 'scale-100 opacity-60'
          }\`} />
          <button
            onClick={voiceState === 'disconnected' || voiceState === 'error' ? startSession : stopSession}
            className={\`absolute w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 \${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white ring-8 ring-emerald-500/30 animate-pulse'
                : voiceState === 'thinking'
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white ring-8 ring-amber-500/30'
                  : voiceState === 'speaking'
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-8 ring-purple-500/30'
                    : \`bg-gradient-to-tr \${theme.previewGradient} text-white hover:scale-105\`
            }\`}
          >
            {voiceState === 'listening' ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : voiceState === 'thinking' ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : voiceState === 'speaking' ? (
              <Volume2 className="w-10 h-10 animate-pulse" />
            ) : (
              <MicOff className="w-10 h-10 opacity-70" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 h-10 w-full max-w-xs my-2">
          {Array.from({ length: 16 }).map((_, idx) => {
            const barHeight = voiceState === 'listening' 
              ? Math.max(15, Math.min(100, volumeLevel + (idx % 3) * 10))
              : voiceState === 'speaking'
                ? Math.floor(Math.random() * 80) + 20
                : 10;
            return (
              <div
                key={idx}
                className={\`w-2 rounded-full transition-all duration-100 \${
                  voiceState === 'listening'
                    ? \`bg-gradient-to-t \${theme.previewGradient}\`
                    : voiceState === 'speaking'
                      ? 'bg-gradient-to-t from-purple-500 to-indigo-400'
                      : 'bg-white/20'
                }\`}
                style={{ height: \`\${barHeight}%\` }}
              />
            );
          })}
        </div>
        <p className="text-xs font-extrabold text-white/80 mt-1 text-center">
          {getStatusText()}
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 hide-scrollbar shrink-0">
        <span className="text-[11px] font-bold text-white/40 shrink-0">مواضيع للنقاش:</span>
        {[
          'حدثني عن خططك لتطوير المنصة',
          'كيف يعمل البث الصوتي المباشر بالذكاء الاصطناعي؟',
          'لخص لي أهم ميزات نموذج Gemini 3',
          'اقترح استراتيجية فعالة لإدارة الوقت'
        ].map((topic, idx) => (
          <button
            key={idx}
            onClick={() => handleSendText(topic)}
            className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all shrink-0 font-medium"
          >
            {topic}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-4 rounded-3xl bg-black/30 border border-white/10 hide-scrollbar mb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={\`flex flex-col \${msg.sender === 'user' ? 'items-start' : 'items-end'}\`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-bold text-white/40">
              {msg.sender === 'user' ? (
                <>
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>أنت (بث حي)</span>
                </>
              ) : (
                <>
                  <Sparkles className={\`w-3 h-3 \${theme.textAccent}\`} />
                  <span>THOTH Voice</span>
                  {msg.modelUsed && (
                    <span className={\`text-[9px] px-1.5 py-0.2 \${theme.bgAccent} \${theme.textAccentBright} rounded-md\`}>
                      {msg.modelUsed}
                    </span>
                  )}
                </>
              )}
              <span className="text-[10px] text-white/30 mr-2">{msg.timestamp}</span>
            </div>
            <div
              className={\`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed \${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-[#181d2d] text-white/90 border border-white/10 rounded-bl-none shadow-lg'
              }\`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="أو اكتب رسالتك هنا للإرسال بالصوت المباشر..."
          className={\`flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/40 outline-none focus:\${theme.borderAccent} transition-all\`}
        />
        <button
          onClick={() => handleSendText()}
          disabled={!inputText.trim()}
          className={\`p-2.5 rounded-2xl \${theme.btnPrimary} disabled:opacity-40 transition-all font-bold\`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log("src/components/VoiceDialog.tsx written!");
