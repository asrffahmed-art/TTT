import { useState, useEffect, useRef } from 'react';
import { Languages, ArrowLeftRight, Volume2, Copy, Check, Mic, MicOff, Sparkles, RefreshCw, BookOpen, MessageSquare, X, ChevronDown } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAppTheme } from '../lib/themeService';
import { useLanguage } from '../lib/LanguageContext';
import { liveWsUrl } from '../services/wsUrl';

interface LiveTranslateProps {
  onSendToChat?: (text: string) => void;
  onNavigate?: (tab: string) => void;
}

interface LangOption {
  id: string;
  ar: string;
  en: string;
  bcp47: string;
}

interface DialectOption {
  id: string;
  arName: string;
  arLabel: string;
  enName: string;
  enLabel: string;
  bcp47: string;
}

const MAIN_LANGUAGES: LangOption[] = [
  { id: 'auto', ar: 'تلقائي', en: 'Auto Detect', bcp47: 'ar-SA' },
  { id: 'ar', ar: 'العربية', en: 'Arabic', bcp47: 'ar-SA' },
  { id: 'en', ar: 'الإنجليزية', en: 'English', bcp47: 'en-US' },
  { id: 'coptic', ar: 'القبطية المصرية', en: 'Coptic Egyptian', bcp47: 'en-US' },
  { id: 'fr', ar: 'الفرنسية', en: 'French', bcp47: 'fr-FR' },
  { id: 'de', ar: 'الألمانية', en: 'German', bcp47: 'de-DE' },
  { id: 'es', ar: 'الإسبانية', en: 'Spanish', bcp47: 'es-ES' },
  { id: 'tr', ar: 'التركية', en: 'Turkish', bcp47: 'tr-TR' },
  { id: 'it', ar: 'الإيطالية', en: 'Italian', bcp47: 'it-IT' },
  { id: 'ru', ar: 'الروسية', en: 'Russian', bcp47: 'ru-RU' },
  { id: 'zh', ar: 'الصينية', en: 'Chinese', bcp47: 'zh-CN' },
  { id: 'ja', ar: 'اليابانية', en: 'Japanese', bcp47: 'ja-JP' },
  { id: 'ko', ar: 'الكورية', en: 'Korean', bcp47: 'ko-KR' }
];

const ARABIC_DIALECTS: DialectOption[] = [
  { id: 'ar_msa', arName: 'العربية (فصحى)', arLabel: 'العربية الفصحى المعيارية', enName: 'Standard Arabic', enLabel: 'Modern Standard Arabic', bcp47: 'ar-SA' },
  { id: 'ar_eg', arName: 'المصرية', arLabel: 'اللهجة المصرية', enName: 'Egyptian', enLabel: 'Egyptian Dialect', bcp47: 'ar-EG' },
  { id: 'ar_sa_najdi', arName: 'السعودية (نجدي)', arLabel: 'اللهجة السعودية (نجدي)', enName: 'Saudi (Najdi)', enLabel: 'Saudi Najdi Dialect', bcp47: 'ar-SA' },
  { id: 'ar_sa_hijazi', arName: 'السعودية (حجازي)', arLabel: 'اللهجة السعودية (حجازي)', enName: 'Saudi (Hijazi)', enLabel: 'Saudi Hijazi Dialect', bcp47: 'ar-SA' },
  { id: 'ar_ae', arName: 'الإماراتية', arLabel: 'اللهجة الإماراتية', enName: 'Emirati', enLabel: 'Emirati Dialect', bcp47: 'ar-AE' },
  { id: 'ar_levant', arName: 'الشامية', arLabel: 'اللهجة الشامية (سوري، لبناني، أردني، فلسطيني)', enName: 'Levantine', enLabel: 'Levantine (Syrian, Lebanese, Palestinian, Jordanian)', bcp47: 'ar-JO' },
  { id: 'ar_ma', arName: 'المغربية', arLabel: 'اللهجة المغربية', enName: 'Moroccan', enLabel: 'Moroccan Darija', bcp47: 'ar-MA' },
  { id: 'ar_iq', arName: 'العراقية', arLabel: 'اللهجة العراقية', enName: 'Iraqi', enLabel: 'Iraqi Dialect', bcp47: 'ar-IQ' },
  { id: 'ar_sd', arName: 'السودانية', arLabel: 'اللهجة السودانية', enName: 'Sudanese', enLabel: 'Sudanese Dialect', bcp47: 'ar-SD' }
];

export function LiveTranslate({ onSendToChat, onNavigate }: LiveTranslateProps) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [sourceLangId, setSourceLangId] = useState('auto');
  const [sourceDialectId, setSourceDialectId] = useState<string | null>(null);
  
  const [targetLangId, setTargetLangId] = useState('en');
  const [targetDialectId, setTargetDialectId] = useState<string | null>(null);

  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStatusText, setLiveStatusText] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Dialect modal state
  const [isDialectModalOpen, setIsDialectModalOpen] = useState(false);
  const [activeDialectSide, setActiveDialectSide] = useState<'source' | 'target'>('source');
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getLangName = (langId: string, dialectId: string | null, targetLoc: 'ar' | 'en' = isAr ? 'ar' : 'en') => {
    if (langId === 'ar' && dialectId) {
      const d = ARABIC_DIALECTS.find(item => item.id === dialectId);
      if (d) return targetLoc === 'ar' ? d.arName : d.enName;
    }
    const main = MAIN_LANGUAGES.find(item => item.id === langId);
    if (main) return targetLoc === 'ar' ? main.ar : main.en;
    return langId;
  };

  const getLangBcp47 = (langId: string, dialectId: string | null) => {
    if (langId === 'ar' && dialectId) {
      const d = ARABIC_DIALECTS.find(item => item.id === dialectId);
      if (d) return d.bcp47;
    }
    const main = MAIN_LANGUAGES.find(item => item.id === langId);
    return main ? main.bcp47 : 'en-US';
  };

  const handleLangChange = (valId: string, side: 'source' | 'target') => {
    if (valId === 'ar') {
      if (side === 'source') {
        setSourceLangId('ar');
        if (!sourceDialectId) setSourceDialectId('ar_msa');
      } else {
        setTargetLangId('ar');
        if (!targetDialectId) setTargetDialectId('ar_msa');
      }
      setActiveDialectSide(side);
      setIsDialectModalOpen(true);
    } else {
      if (side === 'source') {
        setSourceLangId(valId);
        setSourceDialectId(null);
      } else {
        setTargetLangId(valId);
        setTargetDialectId(null);
      }
    }
  };

  const handleSelectDialect = (dialectId: string) => {
    if (activeDialectSide === 'source') {
      setSourceLangId('ar');
      setSourceDialectId(dialectId);
    } else {
      setTargetLangId('ar');
      setTargetDialectId(dialectId);
    }
    setIsDialectModalOpen(false);
  };

  // Swap languages
  const handleSwap = () => {
    if (sourceLangId === 'auto') return;
    const prevSrcLang = sourceLangId;
    const prevSrcDialect = sourceDialectId;

    setSourceLangId(targetLangId);
    setSourceDialectId(targetDialectId);

    setTargetLangId(prevSrcLang);
    setTargetDialectId(prevSrcDialect);

    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  // Perform translation call
  const performTranslation = async (text: string, srcId: string, srcDia: string | null, tgtId: string, tgtDia: string | null) => {
    if (!text.trim()) {
      setTranslatedText('');
      setTransliteration('');
      setNotes('');
      return;
    }

    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      const srcName = getLangName(srcId, srcDia, 'ar');
      const tgtName = getLangName(tgtId, tgtDia, 'ar');

      const res = await fetch('/api/live-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          sourceLang: srcName,
          targetLang: tgtName,
          userId: currentUser ? currentUser.uid : null
        })
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
      
      // Distinguish REAL quota limits (server-confirmed) from server/network failures.
      const isRealLimitError = !!(data && data.error && (data.code === 'LIMIT_REACHED' || data.code === 'LOGIN_REQUIRED'));

      if (isRealLimitError) {
        setTranslatedText(isAr
          ? 'عذراً، لقد نفد رصيد الاستخدام المتاح للترجمة اليوم. يرجى تسجيل الدخول أو ترقية باقتك لمتابعة الاستخدام بلا حدود.'
          : 'Sorry, your daily translation limit has been reached. Please log in or upgrade your subscription for unlimited access.');
        return;
      }

      if (!res.ok) {
        setTranslatedText(isAr
          ? (res.status === 404
              ? 'تعذر الوصول إلى خدمة الترجمة: الـ API غير متاحة حالياً (404). يبدو أن الباك إند غير منشور أو قيد النشر. برجاء المحاولة لاحقاً.'
              : `حدث خطأ في خادم الترجمة (رمز ${res.status}). يرجى إعادة المحاولة بعد قليل.`)
          : (res.status === 404
              ? 'Cannot reach the translation service: API unavailable (404). The backend may not be deployed yet. Please try again later.'
              : `A translation server error occurred (code ${res.status}). Please try again shortly.`));
        return;
      }

      setTranslatedText(data.translatedText || '');
      setTransliteration(data.transliteration || '');
      setNotes(data.notes || '');

    } catch (err) {
      console.error('Translation error:', err);
      setTranslatedText(isAr ? 'حدث خطأ أثناء إجراء الترجمة الفورية.' : 'An error occurred during real-time translation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-translate on typing with debounce
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    if (sourceText.trim() && !isRecording) {
      debounceTimerRef.current = setTimeout(() => {
        performTranslation(sourceText, sourceLangId, sourceDialectId, targetLangId, targetDialectId);
      }, 500);
    } else if (!sourceText.trim()) {
      setTranslatedText('');
      setTransliteration('');
      setNotes('');
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [sourceText, sourceLangId, sourceDialectId, targetLangId, targetDialectId, isRecording]);

  // Speech synthesis for translated text
  const handleSpeak = (text: string, bcp47Tag: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47Tag;
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper functions
  const ensureOutputCtx = async (): Promise<AudioContext> => {
    if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioCtxRef.current = new AudioCtx();
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
      await outputAudioCtxRef.current.resume();
    }
    return outputAudioCtxRef.current;
  };

  const playAudioChunk = async (base64Data: string) => {
    try {
      const ctx = await ensureOutputCtx();
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      const sampleRate = 24000;
      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };
    } catch (e) {
      console.warn("Audio playback chunk notice:", e);
    }
  };

  const stopLiveSession = () => {
    setIsRecording(false);
    setIsLiveActive(false);
    setLiveStatusText('');

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch(e) {}
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch(e) {}
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e) {}
      audioCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch(e) {}
      wsRef.current = null;
    }
  };

  // Mic recording for Speech-to-Speech Real-time Translation via Gemini 3.5 Live Translate (Live API)
  const handleVoiceInput = async () => {
    if (isRecording) {
      stopLiveSession();
      return;
    }

    try {
      setIsRecording(true);
      setLiveStatusText(isAr ? 'جاري الاتصال بـ Gemini 3.5 Live Translate...' : 'Connecting to Gemini 3.5 Live Translate...');

      const targetLang = targetLangId === 'ar' ? (targetDialectId || 'ar_msa') : targetLangId;
      const currentUser = auth.currentUser;
      const userId = currentUser ? currentUser.uid : '';
      const wsUrl = liveWsUrl(`/api/live-translate-ws?targetLang=${encodeURIComponent(targetLang)}&userId=${encodeURIComponent(userId)}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveStatusText(isAr ? 'متصل بـ Gemini 3.5 Live Translate' : 'Connected to Gemini 3.5 Live Translate');
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'live_ready') {
            setIsLiveActive(true);
            setLiveStatusText(isAr ? 'تحدث الآن، الترجمة الحية نشطة...' : 'Speak now, live translation active...');
            await startLiveMicStream();
          } else if (msg.type === 'translated_text' && msg.text) {
            setTranslatedText(prev => prev ? prev + ' ' + msg.text : msg.text);
          } else if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'guest_limit_reached') {
            setTranslatedText(msg.message || (isAr ? 'انتهت مدة الاستخدام اليومية للترجمة الصوتية الحية.' : 'Daily live voice limit reached.'));
            stopLiveSession();
          } else if (msg.type === 'error') {
            console.error("Live translation error message:", msg.message);
            stopLiveSession();
          }
        } catch (e) {
          console.error("Failed to parse Live WS message:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("Live WS error:", e);
        stopLiveSession();
      };

      ws.onclose = () => {
        setIsLiveActive(false);
        setIsRecording(false);
      };

    } catch (err: any) {
      console.warn('Live translation start error:', err);
      stopLiveSession();
    }
  };

  const startLiveMicStream = async () => {
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

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;
      
      source.connect(processor);
      
      // Connect to a dummy gain node (muted) to keep the audio graph active in some browsers
      const dummyGain = audioCtx.createGain();
      dummyGain.gain.value = 0;
      processor.connect(dummyGain);
      dummyGain.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to Base64
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Chunk = btoa(binary);

        wsRef.current.send(JSON.stringify({
          type: 'audio',
          audio: base64Chunk,
          mimeType: 'audio/pcm;rate=16000'
        }));
      };

    } catch (err) {
      console.warn("Microphone access error in Live Translate:", err);
      stopLiveSession();
    }
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const suggestedPhrases = isAr ? [
    'مرحباً بك في منصة THOTH',
    'ازيك عامل ايه يارب تكون بخير',
    'شلونك شخبارك عساك طيب',
    'I am exploring artificial intelligence',
    'Comment puis-je vous aider?'
  ] : [
    'Welcome to THOTH platform',
    'How are you doing today?',
    'Tell me more about your features',
    'مرحباً بك في منصة THOTH الذكية',
    'Bonjour, enchanté de vous rencontrer!'
  ];

  return (
    <div 
      className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.previewGradient} p-0.5 shadow-lg`}>
            <div className={`w-full h-full bg-[#141824] rounded-[10px] flex items-center justify-center`}>
              <Languages className={`w-5 h-5 ${theme.textAccent}`} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-3">
              <span>{isAr ? 'الترجمة الحية' : 'Live Translate'}</span>
              <span className={`text-[10px] ${theme.bgAccent} ${theme.textAccentBright} px-2.5 py-0.5 rounded-full border ${theme.borderAccent} font-mono font-bold tracking-wide shadow-sm`}>
                THOTH Live
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-white/50 leading-relaxed max-w-2xl">
          {isAr 
            ? 'ترجمة حية فورية شديدة الدقة والسلاسة مع إمكانية الترجمة بين اللغات واللهجات العربية المختلفة باحترافية عالية.'
            : 'Real-time, high-precision translation across global languages and Arabic dialects with cultural nuance.'}
        </p>
      </div>

      {/* Language Selector Controls */}
      <div className={`flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 backdrop-blur-xl shadow-lg gap-2 relative`}>
        {/* Source Language Side */}
        <div className="flex items-center gap-2 flex-1 relative">
          <select 
            value={sourceLangId}
            onChange={(e) => handleLangChange(e.target.value, 'source')}
            className="bg-transparent text-white font-bold text-xs sm:text-sm outline-none cursor-pointer w-full"
          >
            {MAIN_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} className="bg-[#141824]">
                {isAr ? l.ar : l.en}
              </option>
            ))}
          </select>
          {sourceLangId === 'ar' && (
            <button
              onClick={() => {
                setActiveDialectSide('source');
                setIsDialectModalOpen(!isDialectModalOpen);
              }}
              className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-xl ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} hover:scale-105 transition-transform flex items-center gap-1 shadow-sm`}
              title={isAr ? 'اختر اللهجة العربية' : 'Select Arabic Dialect'}
            >
              <span>
                {sourceDialectId 
                  ? (ARABIC_DIALECTS.find(d => d.id === sourceDialectId)?.[isAr ? 'arName' : 'enName'] || (isAr ? 'فصحى' : 'Standard')) 
                  : (isAr ? 'فصحى' : 'Standard')}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          {/* Source Dialect Dropdown Menu */}
          {isDialectModalOpen && activeDialectSide === 'source' && (
            <div className={`absolute top-full ${isAr ? 'right-0' : 'left-0'} mt-2 w-64 bg-[#141824]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2`}>
              <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                <span className="text-xs font-black text-white">{isAr ? 'اختر اللهجة العربية' : 'Select Arabic Dialect'}</span>
                <button onClick={() => setIsDialectModalOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto hide-scrollbar">
                {ARABIC_DIALECTS.map((d) => {
                  const isSelected = sourceDialectId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDialect(d.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${isAr ? 'text-right' : 'text-left'} transition-all ${
                        isSelected 
                          ? `${theme.bgAccent} text-white font-bold border ${theme.borderAccent}` 
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{isAr ? d.arLabel : d.enLabel}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleSwap}
          disabled={sourceLangId === 'auto'}
          className={`mx-2 p-2 rounded-xl transition-all shadow-md ${sourceLangId === 'auto' ? 'opacity-30 cursor-not-allowed' : `bg-white/10 hover:bg-white/20 text-white`}`}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* Target Language Side */}
        <div className={`flex items-center gap-2 flex-1 justify-end relative`} dir={isAr ? 'ltr' : 'rtl'}>
          {targetLangId === 'ar' && (
            <button
              onClick={() => {
                setActiveDialectSide('target');
                setIsDialectModalOpen(!isDialectModalOpen);
              }}
              className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-xl ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} hover:scale-105 transition-transform flex items-center gap-1 shadow-sm`}
              title={isAr ? 'اختر اللهجة العربية' : 'Select Arabic Dialect'}
            >
              <span>
                {targetDialectId 
                  ? (ARABIC_DIALECTS.find(d => d.id === targetDialectId)?.[isAr ? 'arName' : 'enName'] || (isAr ? 'فصحى' : 'Standard')) 
                  : (isAr ? 'فصحى' : 'Standard')}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          {/* Target Dialect Dropdown Menu */}
          {isDialectModalOpen && activeDialectSide === 'target' && (
            <div className={`absolute top-full ${isAr ? 'left-0' : 'right-0'} mt-2 w-64 bg-[#141824]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 text-right`} dir={isAr ? 'rtl' : 'ltr'}>
              <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                <span className="text-xs font-black text-white">{isAr ? 'اختر اللهجة العربية' : 'Select Arabic Dialect'}</span>
                <button onClick={() => setIsDialectModalOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto hide-scrollbar">
                {ARABIC_DIALECTS.map((d) => {
                  const isSelected = targetDialectId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDialect(d.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${isAr ? 'text-right' : 'text-left'} transition-all ${
                        isSelected 
                          ? `${theme.bgAccent} text-white font-bold border ${theme.borderAccent}` 
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{isAr ? d.arLabel : d.enLabel}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <select 
            value={targetLangId}
            onChange={(e) => handleLangChange(e.target.value, 'target')}
            className={`bg-transparent text-white font-bold text-xs sm:text-sm outline-none cursor-pointer w-full ${isAr ? 'text-right' : 'text-left'}`}
          >
            {MAIN_LANGUAGES.filter(l => l.id !== 'auto').map((l) => (
              <option key={l.id} value={l.id} className="bg-[#141824]">
                {isAr ? l.ar : l.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Phrases */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 hide-scrollbar shrink-0">
        <span className="text-[11px] font-bold text-white/40 shrink-0">
          {isAr ? 'عبارات مقترحة:' : 'Suggested phrases:'}
        </span>
        {suggestedPhrases.map((phrase, idx) => (
          <button
            key={idx}
            onClick={() => setSourceText(phrase)}
            className={`px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 hover:${theme.borderAccent} transition-all shrink-0 font-medium`}
          >
            {phrase.length > 30 ? phrase.substring(0, 30) + '...' : phrase}
          </button>
        ))}
      </div>

      {/* Live Audio Status Banner */}
      {isRecording && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-200">
              {liveStatusText || (isAr ? 'الترجمة الصوتية الحية نشطة (Gemini 3.5 Live Translate)' : 'Live voice translation active (Gemini 3.5 Live Translate)')}
            </span>
          </div>
          <button
            onClick={stopLiveSession}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {isAr ? 'إيقاف' : 'Stop'}
          </button>
        </div>
      )}

      {/* Main Dual Box Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        
        {/* Source Text Area */}
        <div className={`flex flex-col p-5 rounded-3xl bg-white/5 border border-white/10 shadow-xl min-h-[220px] focus-within:bg-white/10 focus-within:${theme.borderAccent} transition-all`}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
            <span className={`text-xs font-bold ${theme.textAccentBright}`}>
              {isAr ? `من (${getLangName(sourceLangId, sourceDialectId)})` : `From (${getLangName(sourceLangId, sourceDialectId)})`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleVoiceInput}
                className={`p-2 rounded-xl transition-all ${
                  isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title={isAr ? 'تحدث للإدخال الصوتي' : 'Voice Input'}
              >
                {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              {sourceText && (
                <button
                  onClick={() => handleSpeak(sourceText, getLangBcp47(sourceLangId, sourceDialectId))}
                  className="p-2 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  title={isAr ? 'استماع للنص الأصلي' : 'Listen to original text'}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={isAr ? 'اكتب أو تحدث بالنص المراد ترجمته...' : 'Type or speak text to translate...'}
            className="w-full flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/30 outline-none resize-none leading-relaxed"
            rows={5}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[11px] font-mono text-white/40">
            <span>{sourceText.length} {isAr ? 'حرف' : 'characters'}</span>
            {sourceText && (
              <button
                onClick={() => setSourceText('')}
                className={`hover:${theme.textAccentBright} transition-colors font-bold`}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Target Translated Text Area */}
        <div className={`flex flex-col p-5 rounded-3xl bg-gradient-to-br ${theme.previewGradient} border ${theme.borderAccent} shadow-2xl min-h-[220px] relative`}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white shadow-sm">
                {isAr ? `إلى (${getLangName(targetLangId, targetDialectId)})` : `To (${getLangName(targetLangId, targetDialectId)})`}
              </span>
              {isLoading && <RefreshCw className="w-3.5 h-3.5 text-white/80 animate-spin" />}
            </div>
            <div className="flex items-center gap-1.5">
              {translatedText && (
                <>
                  <button
                    onClick={() => handleSpeak(translatedText, getLangBcp47(targetLangId, targetDialectId))}
                    className="p-2 rounded-xl bg-black/20 text-white hover:bg-black/30 transition-all shadow-sm"
                    title={isAr ? 'استماع للترجمة' : 'Listen to translation'}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-black/20 text-white hover:bg-black/30 transition-all shadow-sm"
                    title={isAr ? 'نسخ الترجمة' : 'Copy translation'}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/80 gap-3 py-8">
              <Sparkles className="w-6 h-6 animate-spin opacity-80" />
              <span className="text-xs font-bold animate-pulse">
                {isAr ? 'جاري صياغة الترجمة بأسلوب THOTH...' : 'Crafting translation with THOTH...'}
              </span>
            </div>
          ) : translatedText.includes('عذراً') || translatedText.includes('Sorry') ? (
            <div className="flex-1 flex flex-col gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-sm leading-relaxed text-amber-100 font-medium">{translatedText}</p>
              </div>
              <div className="flex gap-3 items-center mt-2 justify-end">
                <button 
                  onClick={() => setTranslatedText('')}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-all"
                >
                  {isAr ? 'انتظر' : 'Dismiss'}
                </button>
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('subscription');
                  }}
                  className={`px-5 py-2 rounded-xl bg-gradient-to-r ${theme.previewGradient} border ${theme.borderAccent} text-white text-xs font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all`}
                >
                  {isAr ? 'صفحة الخطط' : 'Upgrade Plan'}
                </button>
              </div>
            </div>
          ) : translatedText ? (
            <div className="flex-1 flex flex-col justify-between" dir={targetLangId === 'ar' ? 'rtl' : 'ltr'}>
              <p className={`text-sm text-white leading-relaxed font-bold whitespace-pre-wrap drop-shadow-md ${targetLangId === 'ar' ? 'text-right' : 'text-left'}`}>
                {translatedText}
              </p>
              
              {/* Transliteration and Notes */}
              {(transliteration || notes) && (
                <div className="mt-4 pt-3 border-t border-white/20 space-y-2" dir={isAr ? 'rtl' : 'ltr'}>
                  {transliteration && (
                    <div className="flex items-start gap-1.5 text-[11px] text-white/90">
                      <BookOpen className="w-3.5 h-3.5 opacity-70 shrink-0 mt-0.5" />
                      <span><strong className="opacity-70 font-black">{isAr ? 'النطق:' : 'Pronunciation:'}</strong> {transliteration}</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex items-start gap-1.5 text-[11px] text-white/90 bg-black/10 p-2 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 opacity-70 shrink-0 mt-0.5" />
                      <span><strong className="opacity-70 font-black">{isAr ? 'سياق:' : 'Context:'}</strong> {notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40 text-xs font-bold">
              {isAr ? 'ستظهر الترجمة هنا بشكل فوري ودقيق...' : 'Translation will appear here in real-time...'}
            </div>
          )}

          {onSendToChat && translatedText && (
            <button
              onClick={() => onSendToChat(`${isAr ? 'ترجمة' : 'Translation'}: "${sourceText}" -> "${translatedText}"`)}
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 bg-black/20 hover:bg-black/30 text-white rounded-xl text-xs font-bold border border-white/10 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{isAr ? 'إرسال النتيجة إلى المحادثة الذكية' : 'Send result to AI Chat'}</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}

