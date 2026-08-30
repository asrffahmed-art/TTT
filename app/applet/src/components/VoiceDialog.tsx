import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Play, X, ArrowRight, MessageSquare, Loader2, Radio, 
  Volume2, Sparkles, Check, RefreshCw, Zap, Waves, User, Pause
} from 'lucide-react';

export interface VoiceOption {
  id: string;
  name: string;
  arabicName: string;
  gender: 'female' | 'male';
  tag: string;
  description: string;
  tone: string;
  avatarColor: string;
}

export const GEMINI_MODEL_VOICES: VoiceOption[] = [
  {
    id: 'Aoede',
    name: 'Aoede',
    arabicName: 'أويدي',
    gender: 'female',
    tag: 'الافتراضي • دافئ ومشرق',
    description: 'صوت أنثوي فصيح ومتزن، ممتاز للحوارات الذكية اليومية.',
    tone: 'أنثوي متزن',
    avatarColor: 'from-pink-500 to-purple-600'
  },
  {
    id: 'Kore',
    name: 'Kore',
    arabicName: 'كوري',
    gender: 'female',
    tag: 'ناعم وهادئ',
    description: 'صوت أنثوي رقيق ومريح جداً للاستماع الممتد والقراءة.',
    tone: 'أنثوي ناعم',
    avatarColor: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    arabicName: 'زيفر',
    gender: 'female',
    tag: 'نقي ومتزن',
    description: 'صوت أنثوي احترافي بوضوح عالي لكافة الاستخدامات.',
    tone: 'أنثوي احترافي',
    avatarColor: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'Puck',
    name: 'Puck',
    arabicName: 'بوك',
    gender: 'male',
    tag: 'حيوي ومرح',
    description: 'صوت ذكوري شبابي تفاعلي مفعم بالحماس والحيوية.',
    tone: 'ذكوري تفاعلي',
    avatarColor: 'from-amber-500 to-orange-600'
  },
  {
    id: 'Charon',
    name: 'Charon',
    arabicName: 'شارون',
    gender: 'male',
    tag: 'عميق ورزين',
    description: 'صوت ذكوري فخم، عميق ورسمي مخصص للشروح الدقيقة.',
    tone: 'ذكوري عميق',
    avatarColor: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    arabicName: 'فنرير',
    gender: 'male',
    tag: 'قوي وحماسي',
    description: 'صوت ذكوري قوي وواثق يمنح الطاقة والوضوح الفائق.',
    tone: 'ذكوري حماسي',
    avatarColor: 'from-rose-500 to-red-600'
  }
];

export function VoiceDialog({ onClose }: { onClose: () => void }) {
  const [voiceState, setVoiceState] = useState<'initial' | 'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutedUI, setIsMutedUI] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [lastSubtitle, setLastSubtitle] = useState<string>('مرحباً بك! أنا THOTH جاهز للحوار الصوتي المباشر.');
  const [activeTab, setActiveTab] = useState<'live' | 'voices'>('live');

  // Unified voice selection from localStorage
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(() => {
    const saved = localStorage.getItem('thoth_selected_voice') || localStorage.getItem('thoth_live_voice') || 'Aoede';
    return GEMINI_MODEL_VOICES.find(v => v.id === saved) || GEMINI_MODEL_VOICES[0];
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isSessionActiveRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);

  const initOutputCtx = () => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
      outputAudioCtxRef.current.resume();
    }
  };

  const clearAudioQueue = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) return;
    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);

      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }

      const audioBuffer = outputAudioCtxRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = outputAudioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioCtxRef.current.destination);

      const currentTime = outputAudioCtxRef.current.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);

      source.start(startTime);
      setVoiceState('speaking');

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setVoiceState('listening');
        }
      };

      activeSourcesRef.current.push(source);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const stopSession = () => {
    isSessionActiveRef.current = false;
    clearAudioQueue();

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try { inputAudioCtxRef.current.close().catch(() => {}); } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    setVoiceState('initial');
  };

  useEffect(() => {
    startConversation(selectedVoice.id);
    return () => {
      stopSession();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const changeVoice = (voice: VoiceOption) => {
    setSelectedVoice(voice);
    localStorage.setItem('thoth_selected_voice', voice.id);
    localStorage.setItem('thoth_live_voice', voice.id);
    window.dispatchEvent(new Event('thoth_voice_changed'));
    setLastSubtitle(`تم تغيير صوت الموديل المباشر إلى (${voice.arabicName}). جاري بدء الاتصال...`);
    startConversation(voice.id);
  };

  const previewVoiceSample = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingVoiceId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `مرحباً بك! أنا المساعد THOTH، أتحدث إليك بصوت ${voice.arabicName}.`,
          voice: voice.id
        })
      });
      const data = await res.json();
      if (data.success && data.audioData) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`);
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewingVoiceId(null);
        audio.onerror = () => setPreviewingVoiceId(null);
        await audio.play();
      } else {
        setPreviewingVoiceId(null);
      }
    } catch (err) {
      setPreviewingVoiceId(null);
    }
  };

  const startConversation = async (voiceId: string = selectedVoice.id) => {
    setErrorMessage(null);
    stopSession();
    isSessionActiveRef.current = true;
    initOutputCtx();
    setVoiceState('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-audio?voice=${encodeURIComponent(voiceId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[GEMINI LIVE] WebSocket Connected with voice: ${voiceId}`);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready' || msg.type === 'live_ready') {
            console.log("[GEMINI LIVE] Session ready");
            setVoiceState('listening');
            setLastSubtitle('تفضل بالتحدث، المساعد يستمع إليك الآن...');
            await startMicrophone();
          } else if (msg.type === 'interrupted') {
            clearAudioQueue();
            setVoiceState('listening');
          } else if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || "حدث خطأ في جلسة الصوت المباشر.");
            stopSession();
            setVoiceState('error');
          }
        } catch (err) {
          console.error("WS message parsing error", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
        setErrorMessage("تعذر الاتصال بالخادم الصوتي المباشر.");
        stopSession();
        setVoiceState('error');
      };

      ws.onclose = () => {
        console.log("[GEMINI LIVE] WebSocket closed");
      };
    } catch (err) {
      console.error("Connection Error:", err);
      setErrorMessage("تعذر الاتصال بالخادم.");
      setVoiceState('error');
    }
  };

  const resample = (samples: Float32Array, oldRate: number, newRate: number): Float32Array => {
    if (oldRate === newRate) return samples;
    const ratio = oldRate / newRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originIndex = i * ratio;
      const index = Math.floor(originIndex);
      const decimal = originIndex - index;
      const nextIndex = Math.min(index + 1, samples.length - 1);
      result[i] = samples[index] * (1 - decimal) + samples[nextIndex] * decimal;
    }
    return result;
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      inputAudioCtxRef.current = audioCtx;
      const actualRate = audioCtx.sampleRate;
      const targetRate = 16000;

      const source = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (e) => {
        if (!isSessionActiveRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const resampledData = resample(inputData, actualRate, targetRate);

        const pcmBuffer = new ArrayBuffer(resampledData.length * 2);
        const pcmView = new DataView(pcmBuffer);
        for (let i = 0; i < resampledData.length; i++) {
          let s = Math.max(-1, Math.min(1, resampledData[i]));
          pcmView.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        let binary = '';
        const bytes = new Uint8Array(pcmBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64AudioChunk = btoa(binary);

        wsRef.current.send(JSON.stringify({
          type: 'audio',
          audio: base64AudioChunk,
          mimeType: 'audio/pcm;rate=16000'
        }));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setErrorMessage("تعذر الوصول للميكروفون. يرجى التأكد من السماح بصلاحية الصوت.");
      stopSession();
      setVoiceState('error');
    }
  };

  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    setIsMutedUI(isMutedRef.current);
  };

  const logoUrl = "https://lh3.googleusercontent.com/aida/AEtjO1Wg82pmVfgFZxFO-qz9VYYxTSRP3OqAGN5n3HmUH0Ob33V6TVfp6dMJR-m5Ch9NtAd6-dXYjd1qDwJUbr5A7p7UTkdML1zSdqB79QWfgfxxxI3xwfIFWl0nCxnAb5VifUW419-8OA1Us67BZO_GNb12XwVGnixnDWm52aCQftb0inQjztwJLrgpBP1k9maaNcs36JjSDXRTddkDfJZFf7Lo9hcIOkT2fnNIm3FGzYuuOjPPKbjNxPm_w_4";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d14] text-[#e2e2e2] font-sans overflow-hidden h-full w-full select-none" dir="rtl">
      
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 w-full h-full opacity-70 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] w-[65%] h-[65%] rounded-full bg-indigo-900/60 blur-[140px] animate-pulse" style={{ animationDuration: '7s' }}></div>
        <div className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-cyan-900/50 blur-[130px] animate-pulse" style={{ animationDuration: '9s' }}></div>
        <div className="absolute -bottom-[15%] left-[25%] w-[70%] h-[70%] rounded-full bg-purple-900/50 blur-[140px] animate-pulse" style={{ animationDuration: '11s' }}></div>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
      </div>

      {/* Futuristic Header */}
      <header className="relative z-20 w-full shrink-0 bg-slate-950/60 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 shadow-lg"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <img 
              src={logoUrl} 
              alt="THOTH AI" 
              className="h-9 w-9 rounded-xl object-cover shadow-md border border-white/20" 
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white tracking-wide">THOTH Live Voice</h1>
                <span className="text-[10px] bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                  Gemini AI
                </span>
              </div>
              <span className="text-[11px] text-white/60 font-mono flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                صوت حقيقي مباشر دون محرك المتصفح (24kHz)
              </span>
            </div>
          </div>

          {/* Tab Switcher & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'live'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
                البث المباشر
              </button>
              <button
                onClick={() => setActiveTab('voices')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'voices'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                أصوات الموديل ({GEMINI_MODEL_VOICES.length})
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Body Layout */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto max-w-4xl mx-auto w-full">

        {activeTab === 'live' ? (
          /* Live Streaming View */
          <div className="flex-1 flex flex-col items-center justify-between w-full space-y-6 py-2">
            
            {/* Active Voice Indicator Pill */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/15 backdrop-blur-xl px-4 py-2 rounded-full shadow-xl">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${selectedVoice.avatarColor} animate-pulse`}></div>
              <span className="text-xs text-white/90 font-bold">
                الصوت النشط: <span className="text-cyan-300 font-extrabold">{selectedVoice.arabicName}</span> ({selectedVoice.tone})
              </span>
              <button
                onClick={() => setActiveTab('voices')}
                className="text-[11px] text-purple-300 hover:text-purple-200 underline font-bold mr-2"
              >
                تغيير الصوت
              </button>
            </div>

            {/* Central Animated Holographic Orb */}
            <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 shrink-0 my-auto">
              
              {/* Outer Energy Ripples */}
              {(voiceState === 'listening' || voiceState === 'speaking') && !isMutedUI && (
                <>
                  <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping opacity-50 scale-[1.4]" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute inset-6 rounded-full border border-cyan-400/40 animate-pulse scale-[1.25]" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/40 to-cyan-500/30 blur-3xl"></div>
                </>
              )}

              {/* Main Glowing Button */}
              <button
                onClick={voiceState === 'initial' || voiceState === 'error' ? () => startConversation() : toggleMute}
                className={`relative z-10 w-48 h-48 sm:w-52 sm:h-52 rounded-full backdrop-blur-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 active:scale-95 hover:scale-105 shadow-2xl ${
                  voiceState === 'speaking'
                    ? 'border-cyan-400 shadow-[0_0_90px_rgba(34,211,238,0.8)] bg-gradient-to-tr from-cyan-600/40 via-indigo-600/50 to-purple-600/40'
                    : voiceState === 'listening' && !isMutedUI
                    ? 'border-purple-400 shadow-[0_0_80px_rgba(168,85,247,0.8)] bg-gradient-to-tr from-purple-600/30 via-indigo-600/40 to-cyan-600/30'
                    : isMutedUI
                    ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] bg-rose-950/40'
                    : 'border-white/20 hover:border-white/40 bg-white/10'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-40 rounded-full"></div>

                {voiceState === 'connecting' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-16 h-16 text-cyan-300 animate-spin drop-shadow-lg" />
                    <span className="text-xs text-cyan-200 font-bold font-mono">Connecting...</span>
                  </div>
                ) : voiceState === 'initial' || voiceState === 'error' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Play className="w-16 h-16 text-white fill-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] mr-1" />
                    <span className="text-xs text-white/90 font-bold">بدء المحادثة</span>
                  </div>
                ) : isMutedUI ? (
                  <div className="flex flex-col items-center gap-2">
                    <MicOff className="w-16 h-16 text-rose-300 drop-shadow-md" />
                    <span className="text-xs text-rose-200 font-bold">مكتوم</span>
                  </div>
                ) : voiceState === 'speaking' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Volume2 className="w-16 h-16 text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.9)] animate-pulse" />
                    <span className="text-xs text-cyan-200 font-bold">يتحدث الآن</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Mic className="w-16 h-16 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse" />
                    <span className="text-xs text-purple-200 font-bold">يستمع...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Audio Wave Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-14 w-full max-w-md">
              {Array.from({ length: 24 }).map((_, i) => {
                const heightPct = voiceState === 'speaking'
                  ? Math.floor(Math.random() * 90) + 10
                  : voiceState === 'listening' && !isMutedUI
                  ? Math.floor(Math.random() * 35) + 10
                  : 12;

                return (
                  <div
                    key={i}
                    className={`w-2 rounded-full transition-all duration-150 ${
                      voiceState === 'speaking'
                        ? 'bg-gradient-to-t from-cyan-500 via-indigo-400 to-purple-300 shadow-[0_0_10px_#38bdf8]'
                        : voiceState === 'listening' && !isMutedUI
                        ? 'bg-purple-400/80 shadow-[0_0_8px_#c084fc]'
                        : 'bg-white/10'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>

            {/* Live Subtitle / Status Display Box */}
            <div className="w-full max-w-lg bg-slate-900/80 border border-white/15 rounded-3xl p-4 sm:p-5 backdrop-blur-2xl shadow-2xl text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-cyan-300">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>
                  {voiceState === 'connecting' && 'جاري تجهيز خادم الصوت المباشر...'}
                  {voiceState === 'listening' && !isMutedUI && 'جاري الاستماع إليك مباشرة...'}
                  {voiceState === 'speaking' && `المساعد (${selectedVoice.arabicName}) يجيبك بصوت الموديل`}
                  {voiceState === 'listening' && isMutedUI && 'الميكروفون مكتوم حالياً'}
                  {voiceState === 'initial' && 'اضغط على الدائرة للبدء'}
                  {voiceState === 'error' && 'حدث خطأ في الاتصال'}
                </span>
              </div>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {errorMessage || lastSubtitle}
              </p>
            </div>

            {/* Retry Button on Error */}
            {voiceState === 'error' && (
              <button
                onClick={() => startConversation()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xl transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة والاتصال الفوري
              </button>
            )}

            {/* Direct Voice Picker Strip */}
            <div className="w-full pt-2">
              <div className="text-xs text-white/50 mb-2 font-bold text-center">أو اختر صوت الموديل المفضل فوراً:</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GEMINI_MODEL_VOICES.map((v) => {
                  const isSelected = selectedVoice.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => changeVoice(v)}
                      className={`p-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-400'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      <span className="font-extrabold text-xs">{v.arabicName}</span>
                      <span className="text-[9px] opacity-75">{v.gender === 'female' ? 'أنثوي' : 'ذكوري'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          /* Voice Selection Screen */
          <div className="w-full space-y-6 py-2">
            
            <div className="text-right space-y-1">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-purple-400" />
                اختر صوت الموديل الرسمي (Gemini AI Native Voices)
              </h2>
              <p className="text-xs text-white/60">
                جميع الأصوات يتم معالجتها مباشرة في السحابة بجودة عالية دون الاعتماد على محرك التحدث المحلي للمتصفح.
              </p>
            </div>

            {/* Voice Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GEMINI_MODEL_VOICES.map((voice) => {
                const isSelected = selectedVoice.id === voice.id;
                const isPreviewing = previewingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => changeVoice(voice)}
                    className={`p-5 rounded-3xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-4 relative group ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-slate-900/60 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${voice.avatarColor} flex items-center justify-center text-white font-bold shadow-lg shrink-0`}>
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-white text-base">{voice.arabicName}</h3>
                            <span className="text-xs font-mono text-white/40">({voice.name})</span>
                          </div>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border mt-1 ${
                            voice.gender === 'female'
                              ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {voice.gender === 'female' ? 'صوت أنثوي ♀' : 'صوت ذكوري ♂'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          النشط
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-purple-200 font-bold">{voice.tag}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{voice.description}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={(e) => previewVoiceSample(voice, e)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isPreviewing
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-white/10 border-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isPreviewing ? (
                          <>
                            <Pause className="w-3.5 h-3.5 animate-pulse" />
                            جاري المعاينة...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-purple-300" />
                            استمع لعينة الصوت
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => changeVoice(voice)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 hover:bg-purple-600 text-white/80 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'محدد حالياً' : 'تفعيل هذا الصوت'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Bottom Switcher to Return to Chat */}
        <div className="w-full pt-4 pb-2">
          <button 
            onClick={onClose}
            className="relative overflow-hidden w-full h-[56px] rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center gap-2.5 active:scale-98 transition-all group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
            <MessageSquare className="w-5 h-5 text-white drop-shadow-sm" />
            <span className="text-sm font-bold text-white drop-shadow-sm">إنهاء البث والتكملة في المحادثة النصية</span>
          </button>
        </div>

      </main>
    </div>
  );
}
