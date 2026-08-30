import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Send, Radio, User, AlertCircle, PhoneOff, Loader2 } from 'lucide-react';
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

  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return output.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

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
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        } else {
          setVoiceState('disconnected');
        }
      };

      audio.onerror = () => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        } else {
          setVoiceState('disconnected');
        }
      };

      audio.play().catch(() => {
        activeAudioRef.current = null;
        if (isSessionActiveRef.current) {
          setVoiceState('listening');
        } else {
          setVoiceState('disconnected');
        }
      });
    } catch (err) {
      activeAudioRef.current = null;
      if (isSessionActiveRef.current) {
        setVoiceState('listening');
      } else {
        setVoiceState('disconnected');
      }
    }
  };


    const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const initOutputCtx = () => {
    if (!outputAudioCtxRef.current) {
      console.log("[1] USER_CLICK");
      console.log("[VOICE DEBUG] Start button clicked, creating output AudioContext");
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioCtxRef.current = new AudioCtx(); // let browser pick default rate
      console.log("[VOICE DEBUG] Output AudioContext state =", outputAudioCtxRef.current.state);
      console.log("[2] AUDIO_CONTEXT_READY");
      console.log("[AUDIO DEBUG] state =", outputAudioCtxRef.current.state);
      console.log("[AUDIO DEBUG] sampleRate =", outputAudioCtxRef.current.sampleRate);
      
      // Play Test Tone
      try {
        const osc = outputAudioCtxRef.current.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, outputAudioCtxRef.current.currentTime); // 440Hz A4
        osc.connect(outputAudioCtxRef.current.destination);
        osc.start();
        osc.stop(outputAudioCtxRef.current.currentTime + 0.5); // Play for 0.5s
        console.log("[TEST TONE] Playing 440Hz sine wave for 0.5s");
      } catch (e) {
        console.error("[TEST TONE ERROR]", e);
      }
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
      const rateMatch = mimeType?.match(/rate=(\d+)/);
      const incomingSampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      console.log("[VOICE DEBUG] PlayAudioChunk with sampleRate =", incomingSampleRate);

      console.log("[PCM PLAYBACK] base64 length =", base64Audio.length);
      const binary = atob(base64Audio);
      const len = binary.length;
      if (len % 2 !== 0) {
        console.error("[PCM DECODE ERROR] byteLength is not even!", len);
      }
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

      console.log("[14] PCM_DECODED");
      console.log("samples =", float32Data.length);
      console.log("bytes =", len);
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      console.log("[15] AUDIOBUFFER_CREATED");
      console.log("channels =", audioBuffer.numberOfChannels);
      console.log("length =", audioBuffer.length);
      console.log("sampleRate =", audioBuffer.sampleRate);
      console.log("duration =", audioBuffer.duration);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Add AnalyserNode for Output RMS
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      const checkRMS = () => {
        const dataArray = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
          if (Math.abs(dataArray[i]) > peak) peak = Math.abs(dataArray[i]);
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        if (rms > 0.001) {
           console.log("[AUDIO OUTPUT DEBUG] rms =", rms.toFixed(5), "peak =", peak.toFixed(5));
        } else {
           // check again in a bit if it's still playing
           if (ctx.state === 'running') {
              setTimeout(checkRMS, 50);
           }
        }
      };
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime + 0.05) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      
      console.log("[16] AUDIO_SOURCE_STARTED");
      console.log("AudioContext.state =", ctx.state);
      source.start(nextStartTimeRef.current);
      setTimeout(checkRMS, 50);
      
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
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      console.log("[VOICE DEBUG] Input AudioContext created");
      console.log("[VOICE DEBUG] Input AudioContext state =", audioCtx.state);
      console.log("[VOICE DEBUG] Input AudioContext actual sampleRate =", audioCtx.sampleRate);
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      // 3. Connect real-time WebSocket to stream raw audio directly to Gemini
      const preferredVoice = localStorage.getItem('thoth_selected_voice') || 'Aoede';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-audio?model=${encodeURIComponent(selectedVoiceModel)}&voice=${encodeURIComponent(preferredVoice)}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSessionActiveRef.current) return;
        console.log("[4] BROWSER_WS_CONNECTED");
        // Keep it connecting until gemini_connected
      };

      ws.onmessage = (event) => {
        if (!isSessionActiveRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'gemini_connected') {
            setVoiceState('listening');
          } else if (msg.type === 'state') {
            if (msg.state === 'thinking') {
              setVoiceState('thinking');
            }
          } else if (msg.type === 'audio_stream' && msg.audio) {
            console.log("[13] AUDIO_RECEIVED_IN_BROWSER");
            console.log("bytes=", msg.audio.length, "mimeType=", msg.mimeType);
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
                modelUsed: selectedVoiceModel === 'gemini-db-model' ? 'Gemini Database Audio (مخصص)' : 'Gemini 3.1 Flash Lite'
              };
              setMessages(prev => [...prev, aiMsg]);
              historyRef.current.push({ role: 'model', text: msg.text });
            }
            if (msg.audio) {
              playAudioData(msg.audio, 'audio/wav');
            }
          } else if (msg.type === 'audio' && msg.data) {
            playAudioData(msg.data, 'audio/wav');
          } else if (msg.type === 'audio_stream' && msg.audio) {
            setVoiceState('speaking');
            playAudioChunk(msg.audio, msg.mimeType);
          } else if (msg.type === 'interrupted') {
            clearAudioQueue();
            setVoiceState('listening');
          } else if (msg.type === 'turn_complete') {
            setVoiceState('listening');
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
        console.warn('VoiceDialog live WebSocket error:', err);
      };

      ws.onclose = (e) => {
        console.log('[BROWSER WS] CLOSED code=', e?.code, 'reason=', e?.reason);
        if (isSessionActiveRef.current && voiceState !== 'error') {
          setVoiceState('disconnected');
        }
      };

      // 4. Stream raw PCM audio chunks continuously
      // Manual resampler if browser ignores sampleRate: 16000
      const targetRate = 16000;
      let resampleRatio = 1;
      let micChunkCount = 0;
      let firstPcmCaptured = false;
      
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

        if (!firstPcmCaptured) {
          console.log("[7] PCM_CAPTURED");
          firstPcmCaptured = true;
        }
        if (micChunkCount < 5) {
          console.log(`[PCM DEBUG] chunk #${micChunkCount + 1} bytes=${inputData.length}`);
          micChunkCount++;
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

          console.log("[8] PCM_SENT_TO_SERVER");
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio
          }));
        }
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

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
    clearAudioQueue();

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch (e) {}
      activeAudioRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }

    setVoiceState('disconnected');
    setVolumeLevel(0);
  };

  const handleSendText = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setInputText('');
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const userMsg: VoiceMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp
    };

    setMessages(prev => [...prev, userMsg]);
    historyRef.current.push({ role: 'user', text: text.trim() });
    setVoiceState('thinking');

    try {
      const user = auth.currentUser;
      const res = await fetch('/api/voice-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          userId: user ? user.uid : 'guest',
          model: selectedVoiceModel,
          voice: localStorage.getItem('thoth_selected_voice') || 'Aoede',
          history: historyRef.current.slice(-6)
        })
      });

      const data = await res.json();
      const reply = data.text || 'عذراً، حدث خطأ أثناء المعالجة الصوتية.';
      const modelUsed = data.modelUsed || (selectedVoiceModel === 'gemini-db-model' ? 'Gemini Database Audio (مخصص)' : 'Gemini 3.1 Flash Lite');

      const aiMsg: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed
      };

      setMessages(prev => [...prev, aiMsg]);
      historyRef.current.push({ role: 'model', text: reply });

      if (data.audioData) {
        playAudioData(data.audioData, data.mimeType || 'audio/wav');
      } else {
        setVoiceState(isSessionActiveRef.current ? 'listening' : 'disconnected');
      }
    } catch (err) {
      console.error('Error in voice text send:', err);
      setVoiceState('error');
      setErrorMessage('تعذر الاتصال بالذكاء الاصطناعي.');
    }
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'connecting':
        return 'جاري بدء اتصال البث الصوتي المباشر...';
      case 'listening':
        return 'بث صوتي حي مباشر (MediaStream) نشط - تحدث إلى Gemini...';
      case 'thinking':
        return 'Gemini يستمع ويعالج الصوت الخام الآن...';
      case 'speaking':
        return 'Gemini يبث الرد الصوتي الطبيعي مباشرة...';
      case 'error':
        return errorMessage || 'حدث خطأ في الخدمة الصوتية';
      case 'disconnected':
      default:
        return 'الجلسة متوقفة. انقر على زر الميكروفون لبدء البث المباشر.';
    }
  };

  const getStatusBadgeClass = () => {
    switch (voiceState) {
      case 'connecting':
        return 'bg-blue-500/15 backdrop-blur-md text-blue-300 border-blue-500/30';
      case 'listening':
        return 'bg-emerald-500/15 backdrop-blur-md text-emerald-300 border-emerald-500/30';
      case 'thinking':
        return 'bg-indigo-500/15 backdrop-blur-md text-indigo-300 border-indigo-500/30';
      case 'speaking':
        return 'bg-purple-500/15 backdrop-blur-md text-purple-300 border-purple-500/30';
      case 'error':
        return 'bg-red-500/15 backdrop-blur-md text-red-300 border-red-500/30';
      case 'disconnected':
      default:
        return 'bg-white/5 backdrop-blur-md text-white/60 border-white/10';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${theme.bgClass} text-white pt-20 pb-24 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-hidden`}>
      
      {/* Top Banner & Control Status Bar */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-white/5 border ${theme.borderAccent} shadow-xl mb-3 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl ${theme.bgAccent} border ${theme.borderAccent} shadow-inner`}>
            <Radio className={`w-6 h-6 ${theme.textAccent} ${voiceState === 'speaking' || voiceState === 'listening' ? 'animate-pulse' : ''}`} />
            {(voiceState === 'speaking' || voiceState === 'listening') && (
              <span className={`absolute -top-1 -right-1 w-3 h-3 ${theme.activeIndicator} rounded-full animate-ping`} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">البث الصوتي المباشر (MediaStream Live)</h2>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadgeClass()}`}>
                {voiceState === 'disconnected' ? 'متوقف' : voiceState === 'connecting' ? 'اتصال...' : voiceState === 'listening' ? 'استماع مباشر' : voiceState === 'thinking' ? 'معالجة' : 'بث صوتي'}
              </span>
            </div>
            <p className={`text-xs ${theme.textAccent} font-medium`}>
              {selectedVoiceModel === 'gemini-db-model' ? 'Gemini Database Audio (مخصص)' : selectedVoiceModel === 'gemini-2.5-flash-native-audio-preview-12-2025' ? 'Gemini 2.5 Flash Native Audio' : 'Gemini 3.1 Flash Lite'}
            </p>
          </div>
        </div>

        {/* Live Session Actions */}
        <div className="flex items-center gap-2">
          {voiceState !== 'disconnected' && voiceState !== 'error' && (
            <button
              onClick={stopSession}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all text-xs font-bold shadow-md"
            >
              <PhoneOff className="w-4 h-4" />
              <span>إنهاء الجلسة</span>
            </button>
          )}
        </div>
      </div>

      {/* Audio Model Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 mb-3 shrink-0">
        <button
          onClick={() => {
            setSelectedVoiceModel('gemini-3.1-flash-lite');
            if (voiceState !== 'disconnected') {
              stopSession();
            }
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedVoiceModel === 'gemini-3.1-flash-lite'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini 3.1 Flash Lite (مباشر)</span>
        </button>

        <button
          onClick={() => {
            setSelectedVoiceModel('gemini-db-model');
            if (voiceState !== 'disconnected') {
              stopSession();
            }
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedVoiceModel === 'gemini-db-model'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 border border-purple-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Gemini Database Audio (مخصص)</span>
        </button>
      </div>

      {/* Error Alert Box */}
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

      {/* Main Interactive Live Waveform Orb Dashboard */}
      <div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">
        <div className={`absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 ${theme.ambientLight1} blur-3xl pointer-events-none rounded-full`} />
        
        {/* Animated Orb */}
        <div className="relative flex items-center justify-center mb-4">
          <div className={`w-32 h-32 rounded-full bg-gradient-to-tr ${theme.previewGradient} blur-2xl transition-all duration-300 ${
            voiceState === 'listening' ? 'scale-125 opacity-100 animate-pulse' : voiceState === 'speaking' ? 'scale-110 opacity-90' : voiceState === 'thinking' ? 'scale-110 opacity-80 animate-spin' : 'scale-100 opacity-60'
          }`} />

          <button
            onClick={voiceState === 'disconnected' || voiceState === 'error' ? startSession : stopSession}
            className={`absolute w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white ring-8 ring-emerald-500/30 animate-pulse'
                : voiceState === 'thinking'
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white ring-8 ring-amber-500/30'
                  : voiceState === 'speaking'
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-8 ring-purple-500/30'
                    : `bg-gradient-to-tr ${theme.previewGradient} text-white hover:scale-105`
            }`}
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

        {/* Live Audio Volume Bar */}
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
                className={`w-2 rounded-full transition-all duration-100 ${
                  voiceState === 'listening'
                    ? `bg-gradient-to-t ${theme.previewGradient}`
                    : voiceState === 'speaking'
                      ? 'bg-gradient-to-t from-purple-500 to-indigo-400'
                      : 'bg-white/20'
                }`}
                style={{ height: `${barHeight}%` }}
              />
            );
          })}
        </div>

        <p className="text-xs font-extrabold text-white/80 mt-1 text-center">
          {getStatusText()}
        </p>
      </div>

      {/* Suggested Spoken Topics */}
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

      {/* Conversation Log Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 rounded-3xl bg-black/30 border border-white/10 hide-scrollbar mb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-bold text-white/40">
              {msg.sender === 'user' ? (
                <>
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>أنت (بث حي)</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-3 h-3 ${theme.textAccent}`} />
                  <span>THOTH Voice</span>
                  {msg.modelUsed && (
                    <span className={`text-[9px] px-1.5 py-0.2 ${theme.bgAccent} ${theme.textAccentBright} rounded-md`}>
                      {msg.modelUsed}
                    </span>
                  )}
                </>
              )}
              <span className="text-[10px] text-white/30 mr-2">{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-[#181d2d] text-white/90 border border-white/10 rounded-bl-none shadow-lg'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Text Input */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="أو اكتب رسالتك هنا للإرسال بالصوت المباشر..."
          className={`flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/40 outline-none focus:${theme.borderAccent} transition-all`}
        />
        <button
          onClick={() => handleSendText()}
          disabled={!inputText.trim()}
          className={`p-2.5 rounded-2xl ${theme.btnPrimary} disabled:opacity-40 transition-all font-bold`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
