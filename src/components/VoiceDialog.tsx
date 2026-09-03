import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PhoneOff, Loader2, Volume2, Check, ChevronDown, RefreshCw, Play, Clock, Lock, LogIn, Sparkles, AlertCircle, GraduationCap, ScrollText
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { getDeviceId } from '../lib/otpService';
import { liveWsUrl } from '../services/wsUrl';
import { LiveCallEngine } from '../services/liveCallEngine';

export interface VoiceOption {
  id: string;
  name: string;
  arabicName: string;
  englishName: string;
  gender: 'female' | 'male';
}

export const GEMINI_MODEL_VOICES: VoiceOption[] = [
  { id: 'Aoede', name: 'Aoede', arabicName: 'أويدي (أنثوي دافئ)', englishName: 'Aoede (Warm Female)', gender: 'female' },
  { id: 'Kore', name: 'Kore', arabicName: 'كوري (أنثوي هادئ)', englishName: 'Kore (Calm Female)', gender: 'female' },
  { id: 'Zephyr', name: 'Zephyr', arabicName: 'زيفر (أنثوي احترافي)', englishName: 'Zephyr (Pro Female)', gender: 'female' },
  { id: 'Puck', name: 'Puck', arabicName: 'بوك (ذكوري مرح)', englishName: 'Puck (Playful Male)', gender: 'male' },
  { id: 'Charon', name: 'Charon', arabicName: 'شارون (ذكوري عميق)', englishName: 'Charon (Deep Male)', gender: 'male' },
  { id: 'Fenrir', name: 'Fenrir', arabicName: 'فنرير (ذكوري قوي)', englishName: 'Fenrir (Strong Male)', gender: 'male' }
];

export function VoiceDialog({ 
  onClose, 
  onOpenAuth,
  teachTopic
}: { 
  onClose: () => void; 
  onOpenAuth?: () => void;
  // [STUDY TOOLS] when set, the server switches this voice session into a
  // focused voice TUTOR for this topic only (Tasks page "learn with voice")
  teachTopic?: string;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [voiceState, setVoiceState] = useState<'initial' | 'connecting' | 'listening' | 'speaking' | 'error'>('initial');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  // [STUDY TOOLS] automatic lesson close: the server sends {type:'lesson_end'}
  // when the tutor says the reserved closing phrase; we let the farewell
  // audio finish, then end the call automatically (owner directive).
  const [lessonEnded, setLessonEnded] = useState(false);
  const autoCloseRef = useRef(false);
  const autoCloseTimerRef = useRef<any>(null);
  const notebookRef = useRef<HTMLDivElement | null>(null);

  const doAutoClose = () => {
    if (!autoCloseRef.current) return;
    autoCloseRef.current = false;
    if (autoCloseTimerRef.current) { clearTimeout(autoCloseTimerRef.current); autoCloseTimerRef.current = null; }
    try { engineRef.current?.stop(true); } catch (e) {}
    isSessionActiveRef.current = false;
    onClose();
  };

  const scheduleAutoClose = () => {
    if (autoCloseTimerRef.current) return;
    // Safety cap: even if playback events misfire, close shortly after the
    // farewell should have finished.
    autoCloseTimerRef.current = setTimeout(doAutoClose, 7000);
  };

  // Auto-scroll the lesson notebook as the tutor speaks
  useEffect(() => {
    if (teachTopic && notebookRef.current) {
      notebookRef.current.scrollTop = notebookRef.current.scrollHeight;
    }
  }, [transcripts, teachTopic]);

  // Guest Voice Quota Management (3 Minutes = 180 Seconds per 24 Hours)
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    const uid = localStorage.getItem('app-user-id') || localStorage.getItem('thoth_user_id');
    return !uid;
  });
  const [guestLimitSeconds, setGuestLimitSeconds] = useState<number>(180);
  const [guestRemainingSeconds, setGuestRemainingSeconds] = useState<number>(180);
  const [isLimitReached, setIsLimitReached] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [checkingQuota, setCheckingQuota] = useState<boolean>(true);

  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(() => {
    const saved = localStorage.getItem('thoth_selected_voice') || localStorage.getItem('thoth_live_voice') || 'Puck';
    return GEMINI_MODEL_VOICES.find(v => v.id === saved) || GEMINI_MODEL_VOICES[0];
  });

  // Call engine: owns the WebSocket transport, mic capture (AudioWorklet at
  // 16kHz, official Gemini Live web-sample architecture), jitter-buffered
  // click-free playback, and full generation-guarded teardown.
  // Mic lifecycle: opened ONCE per live session, streamed continuously to the
  // Gemini Live backend; speech start/end is detected by the model's built-in
  // VAD on that same stream (never by re-arming the microphone).
  const engineRef = useRef<LiveCallEngine | null>(null);

  const isSessionActiveRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const guestTimerRef = useRef<any>(null);
  const sessionAccumulatedSecRef = useRef<number>(0);

  const stopSession = () => {
    isSessionActiveRef.current = false;
    // Engine.stop() sends {type:'stop'}, closes the socket, tears down the mic
    // and playback graphs, and suspends the output context — silence is
    // guaranteed the moment the call ends.
    if (engineRef.current) {
      try { engineRef.current.stop(true); } catch (e) {}
    }
    setVoiceState('initial');
  };

  // [ANDROID TICK FIX — ROOT CAUSE REMOVED]
  // The old build ran a local Web Speech API (SpeechRecognition) alongside the
  // live call to produce user transcripts. On Chrome Android that recognizer
  // auto-ends after every utterance (its `continuous` mode is not truly
  // continuous there), the onend->start() loop re-armed it, and EVERY restart
  // opened an internal second microphone capture — Chrome Android plays a
  // system "tick" sound each time a recognition session starts. Windows has no
  // such sound and iOS PWA never got the API at all, which is why the tick was
  // heard only on Android.
  // It is now REMOVED entirely (its transcripts were never rendered). Turn
  // detection happens exclusively through Gemini's server-side VAD on the ONE
  // continuous LiveCallEngine stream: mic opened once -> PCM streamed ->
  // Gemini detects speech end -> response -> mic stays open. No stop/start of
  // any track, no getUserMedia per turn, no AudioContext churn per turn.

  // Friendly microphone error messages (moved verbatim from the old capture code)
  const micErrorMessage = (err: any): string => {
    let friendlyError = isAr
      ? "يرجى السماح بالوصول للميكروفون من إعدادات المتصفح للبدء بالمحادثة الصوتية."
      : "Please allow microphone access in browser settings to start live voice chat.";
    const errMsg = String(err?.message || err?.name || '');
    if (err?.name === 'NotAllowedError' || errMsg.includes('Permission') || errMsg.includes('denied') || errMsg.includes('NotAllowedError')) {
      friendlyError = isAr
        ? "تم حظر إذن الميكروفون من قِبل النظام أو المتصفح. يرجى تفعيل إذن الميكروفون (رمز 🔒 أو الكاميرا/الميكروفون في شريط العنوان) ثم الضغط على إعادة المحاولة."
        : "Microphone access was denied by system or browser. Please enable microphone permission in the address bar (🔒 icon) and click Retry.";
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || errMsg.includes('NotFoundError')) {
      friendlyError = isAr
        ? "لم يتم العثور على ميكروفون متصل بجهازك. يرجى توصيل ميكروفون والمحاولة ثانية."
        : "No microphone detected on your device. Please connect a microphone and try again.";
    }
    return friendlyError;
  };

  // Create the engine once, with all protocol routing (same WS protocol and
  // guest/limits handling as before — nothing server-side changed).
  const getEngine = (): LiveCallEngine => {
    if (!engineRef.current) {
      engineRef.current = new LiveCallEngine({
        onMessage: (msg) => handleEngineMessage(msg),
        onState: (state, error) => {
          if (state === 'error' && isSessionActiveRef.current) {
            setErrorMessage(error || (isAr ? 'حدث خطأ في الاتصال الصوتي' : 'Voice connection error'));
            stopSession();
            setVoiceState('error');
          }
        },
        onPlaybackEnded: () => {
          if (isSessionActiveRef.current) {
            setVoiceState('listening');
          }
          // [STUDY TOOLS] farewell finished -> end the lesson call gracefully
          if (autoCloseRef.current) {
            setTimeout(doAutoClose, 1200);
          }
        }
      });
      // Debug surface for support/diagnostics (no UI impact)
      (window as any).__thothLive = engineRef.current.stats;
    }
    return engineRef.current;
  };

  const handleEngineMessage = (msg: any) => {
    if (!isSessionActiveRef.current) return;

    if (msg.type === 'guest_status') {
      setIsGuest(true);
      setGuestLimitSeconds(msg.limitSeconds || 180);
      setGuestRemainingSeconds(msg.remainingSeconds ?? 180);
      if (msg.remainingSeconds <= 0) {
        setIsLimitReached(true);
        setShowLimitModal(true);
        stopSession();
      }
    } else if (msg.type === 'guest_limit_reached') {
      setIsGuest(true);
      setIsLimitReached(true);
      setShowLimitModal(true);
      stopSession();
    } else if (msg.type === 'ready' || msg.type === 'live_ready') {
      // Idempotent: the server may send this more than once
      if (!isSessionActiveRef.current) return;
      setVoiceState('listening');
      const engine = engineRef.current;
      if (engine) {
        engine.startCapture()
          .catch((err: any) => {
            console.warn("Microphone access notice:", err?.name || err?.message || err);
            setErrorMessage(micErrorMessage(err));
            stopSession();
            setVoiceState('error');
          });
      }
    } else if (msg.type === 'interrupted') {
      engineRef.current?.stopPlayback();
      setVoiceState('listening');
    } else if (msg.type === 'audio' && msg.audio) {
      engineRef.current?.playPcm(msg.audio, msg.mimeType);
      // [MOBILE UNLOCK] if the output context is still suspended (iOS/PWA
      // autoplay policy), surface the one-tap audio unlock button.
      if (engineRef.current?.isOutputSuspended()) setNeedUserGesture(true);
      setVoiceState('speaking');
    } else if (msg.type === 'text' && msg.text) {
      setTranscripts(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          const newArr = [...prev];
          newArr[newArr.length - 1].text += msg.text;
          return newArr;
        } else {
          return [...prev, { role: 'model', text: msg.text }];
        }
      });
    } else if (msg.type === 'lesson_end') {
      // Tutor said the scripted goodbye — close once the audio finishes.
      setLessonEnded(true);
      autoCloseRef.current = true;
      scheduleAutoClose();
      // If nothing is playing right now, the farewell is already over.
      setTimeout(() => { if (autoCloseRef.current) doAutoClose(); }, 2500);
    } else if (msg.type === 'error') {
      setErrorMessage(msg.message || "حدث خطأ أثناء الاتصال الصوتي");
      stopSession();
      setVoiceState('error');
    } else if (msg.type === 'ws_closed') {
      if (isSessionActiveRef.current) {
        stopSession();
      }
    }
  };

  useEffect(() => {
    // Auto-start on component mount
    startConversation(selectedVoice.id);

    const handleVoiceChange = () => {
      const saved = localStorage.getItem('thoth_selected_voice') || localStorage.getItem('thoth_live_voice') || 'Puck';
      const voiceObj = GEMINI_MODEL_VOICES.find(v => v.id === saved) || GEMINI_MODEL_VOICES[0];
      setSelectedVoice(voiceObj);
      if (isSessionActiveRef.current) {
        startConversation(voiceObj.id);
      }
    };
    window.addEventListener('thoth_voice_changed', handleVoiceChange);

    return () => {
      window.removeEventListener('thoth_voice_changed', handleVoiceChange);
      stopSession();
    };
  }, []);

  // [MOBILE UNLOCK] iOS Safari / home-screen PWA suspend audio contexts created
  // outside a user gesture (the tap on the Tasks "صوت" button is long gone by
  // the time the first audio chunk arrives). ANY tap while the lesson is open
  // now silently re-opens the speaker + mic contexts — the standard unlock
  // pattern used by WhatsApp Web / Meet / etc. Desktop & Android: no-op.
  useEffect(() => {
    const unlock = () => {
      try { engineRef.current?.unlockAudio(); } catch {}
      setTimeout(() => {
        if (engineRef.current && !engineRef.current.isOutputSuspended()) {
          setNeedUserGesture(false);
        }
      }, 350);
    };
    const opts = { passive: true } as any;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchend', unlock, opts);
    window.addEventListener('keydown', unlock as any, opts);
    const onVis = () => { if (!document.hidden) unlock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('keydown', unlock as any);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const changeVoice = (voice: VoiceOption) => {
    setSelectedVoice(voice);
    setShowVoiceMenu(false);
    localStorage.setItem('thoth_selected_voice', voice.id);
    localStorage.setItem('thoth_live_voice', voice.id);
    window.dispatchEvent(new Event('thoth_voice_changed'));
    startConversation(voice.id);
  };

  // Local client timer for guest countdown during active session
  useEffect(() => {
    let interval: any = null;
    if (isGuest && (voiceState === 'listening' || voiceState === 'speaking')) {
      interval = setInterval(() => {
        setGuestRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsLimitReached(true);
            setShowLimitModal(true);
            stopSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGuest, voiceState]);

  const startConversation = async (voiceId: string = selectedVoice.id) => {
    setErrorMessage(null);
    stopSession();
    // [MOBILE UNLOCK] best-effort pre-warm of both audio contexts while the
    // user's tap activation may still be valid (speaker + 16 kHz mic graph).
    try { getEngine().unlockAudio(); } catch {}
    isSessionActiveRef.current = true;
    setVoiceState('connecting');

    try {
      const userId = localStorage.getItem('app-user-id') || localStorage.getItem('thoth_user_id') || '';
      const deviceId = getDeviceId();
      const wsUrl = liveWsUrl(`/api/live-audio?voice=${encodeURIComponent(voiceId)}&userId=${encodeURIComponent(userId)}&deviceId=${encodeURIComponent(deviceId)}${teachTopic ? `&studyTopic=${encodeURIComponent(teachTopic)}` : ''}`);
      const engine = getEngine();
      engine.setMuted(isMutedRef.current);
      await engine.connect(wsUrl);
      // The engine's onMessage router handles live_ready -> startCapture()
    } catch (err: any) {
      console.warn("Voice session start error:", err?.message || err?.name || err);
      setErrorMessage(isAr ? "تعذر الاتصال بالخادم الصوتي المباشر" : "Could not reach the live voice server");
      stopSession();
      setVoiceState('error');
    }
  };



  
  const handleClose = () => {
    stopSession();
    
    onClose();
  };

  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
    try { engineRef.current?.setMuted(isMutedRef.current); } catch (e) {}
  };

  const handleOrbClick = async () => {
    getEngine();
    if (voiceState === 'initial' || voiceState === 'error') {
      startConversation();
    } else {
      toggleMute();
    }
  };

  // [MOBILE UNLOCK] dedicated unlock tap — must NOT route through handleOrbClick
  // (that toggles the mic once the lesson is live). Just resume the audio.
  const handleUnlockAudio = () => {
    const engine = engineRef.current;
    if (!engine) { startConversation(); return; }
    try { engine.unlockAudio(); } catch {}
    setTimeout(() => { if (!engine.isOutputSuspended()) setNeedUserGesture(false); }, 350);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d14] text-white font-sans overflow-hidden select-none" dir={isAr ? "rtl" : "ltr"}>
      
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5 relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500`}></div>
            {teachTopic && <GraduationCap className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="text-sm font-semibold text-white/90 truncate max-w-[60vw]">
              {teachTopic
                ? (isAr 
                    ? `درس صوتي: ${teachTopic.length > 46 ? teachTopic.slice(0, 46) + '…' : teachTopic}`
                    : `Voice lesson: ${teachTopic.length > 46 ? teachTopic.slice(0, 46) + '…' : teachTopic}`)
                : (isAr ? 'محادثة صوتية حية' : 'Live Voice Conversation')}
            </span>
            {teachTopic && (
              <span className="hidden sm:inline text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                {isAr ? 'درس تفاعلي مع THOTH' : 'Interactive lesson'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* [STUDY TOOLS] Lesson roadmap — the lesson has a defined structure */}
      {teachTopic && (
        <div className="w-full px-4 pt-3 relative z-10">
          <div className="max-w-xl mx-auto flex items-center justify-center gap-1.5 flex-wrap">
            {[
              isAr ? 'شرح وتفاعل' : 'Teach',
              isAr ? 'مراجعة' : 'Review',
              isAr ? 'اختبار سريع' : 'Quiz',
              isAr ? 'ختام' : 'Wrap-up'
            ].map((phase, i) => (
              <span key={phase} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-emerald-500/50 text-[10px]">←</span>}
                <span className="text-[10px] font-bold text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                  {i + 1}. {phase}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Center Animated Orb */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Audio Context Unlock Prompt Overlay if needed */}
        {needUserGesture && (
          <button
            onClick={handleUnlockAudio}
            className="mb-6 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-lg animate-bounce flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            {isAr ? 'اضغط لتفعيل صوت المعلم 🔊' : 'Tap to enable lesson audio'}
          </button>
        )}

        {/* Outer Glow */}
        <div className="relative flex items-center justify-center my-auto">
          
          <div 
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full transition-all duration-700 flex items-center justify-center ${
              voiceState === 'speaking'
                ? teachTopic ? 'bg-emerald-500/25 scale-110 blur-xl' : 'bg-indigo-500/25 scale-110 blur-xl'
                : voiceState === 'listening' && !isMuted
                ? teachTopic ? 'bg-teal-500/20 scale-105 blur-lg animate-pulse' : 'bg-purple-500/20 scale-105 blur-lg animate-pulse'
                : 'bg-white/5 blur-md'
            }`}
          />

          {/* Interactive Core Button */}
          <button 
            onClick={handleOrbClick}
            className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 border cursor-pointer active:scale-95 ${
              voiceState === 'speaking'
                ? teachTopic
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-teal-300 shadow-[0_0_40px_rgba(16,185,129,0.55)]'
                  : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 border-cyan-300 shadow-[0_0_40px_rgba(99,102,241,0.6)]'
                : voiceState === 'listening' && !isMuted
                ? teachTopic
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                : isMuted
                ? 'bg-rose-950/50 border-rose-500/60 text-rose-400'
                : 'bg-white/10 border-white/20 hover:bg-white/15'
            }`}
          >
            {voiceState === 'connecting' ? (
              <Loader2 className="w-10 h-10 text-white animate-spin opacity-80" />
            ) : voiceState === 'speaking' ? (
              <div className="flex items-center gap-1.5 h-8">
                <span className="w-1.5 bg-white rounded-full animate-bounce h-6" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 bg-white rounded-full animate-bounce h-9" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: '300ms' }}></span>
                <span className="w-1.5 bg-white rounded-full animate-bounce h-8" style={{ animationDelay: '450ms' }}></span>
              </div>
            ) : isMuted ? (
              <MicOff className="w-10 h-10 text-rose-400" />
            ) : voiceState === 'initial' || voiceState === 'error' ? (
              <Play className="w-10 h-10 text-white fill-white mr-1" />
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <Mic className="w-10 h-10 text-white opacity-90" />
              </div>
            )}
          </button>

        </div>

        {/* Status Text */}
        <div className="text-center space-y-1 mt-8 max-w-sm">
          <p className="text-base font-medium text-white/90">
            {lessonEnded && (isAr ? 'انتهى الدرس ✅ — جاري إنهاء المكالمة...' : 'Lesson complete ✅ — ending call...')}
            {!lessonEnded && voiceState === 'connecting' && (isAr ? 'جاري الاتصال...' : 'Connecting...')}
            {!lessonEnded && voiceState === 'listening' && !isMuted && (isAr ? 'المعلم يستمع إليك... تحدث بحرية' : 'Listening... Speak freely')}
            {!lessonEnded && voiceState === 'speaking' && (isAr ? (teachTopic ? 'المعلم بيشرح...' : 'يتحدث إليك...') : (teachTopic ? 'Teaching...' : 'Speaking...'))}
            {!lessonEnded && voiceState === 'listening' && isMuted && (isAr ? 'الميكروفون مكتوم حالياً' : 'Microphone is muted')}
            {!lessonEnded && voiceState === 'initial' && (isAr ? 'اضغط على الكرة للبدء' : 'Tap the sphere to start')}
            {!lessonEnded && voiceState === 'error' && (errorMessage || (isAr ? 'حدث خطأ بالاتصال' : 'Connection error'))}
          </p>
          <p className="text-xs text-white/40">
            {voiceState === 'error' 
              ? (isAr ? 'انقر أدناه لإعادة الاتصال' : 'Click below to reconnect') 
              : teachTopic
                ? (isAr ? 'اسأل المعلم أي حاجة في الدرس — وخليه يقفل لوحده لما تقول كفايه' : 'Ask anything about the lesson — say “enough” and it ends itself')
                : (isAr ? 'تحدث بشكل طبيعي بدون الانتظار' : 'Speak naturally without waiting')}
          </p>
        </div>

        {voiceState === 'error' && (
          <button
            onClick={handleOrbClick}
            className="mt-4 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-2 border border-white/10 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? 'إعادة الاتصال' : 'Reconnect'}
          </button>
        )}

      </main>

      {/* [STUDY TOOLS] Lesson notebook — live transcript of the tutor (دفتر الدرس) */}
      {teachTopic && (
        <div className="w-full px-4 pb-2 relative z-10">
          <div className="max-w-xl mx-auto bg-white/[0.04] border border-emerald-500/20 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/15 bg-emerald-500/[0.06]">
              <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-black text-emerald-200">{isAr ? 'دفتر الدرس — ملاحظات مباشرة' : 'Lesson notebook — live notes'}</span>
            </div>
            <div ref={notebookRef} className="max-h-28 overflow-y-auto px-4 py-2.5 space-y-1.5 hide-scrollbar" dir={isAr ? 'rtl' : 'ltr'}>
              {transcripts.length === 0 ? (
                <p className="text-[11px] text-white/35 text-center py-2">
                  {isAr ? 'هتلاقي هنا ملخص كلام المعلم وهو بيشرح 📝' : 'The tutor\'s key words will appear here 📝'}
                </p>
              ) : (
                transcripts.filter(t => t.text && t.text.trim()).map((t, i) => (
                  <p key={i} className="text-[11px] leading-relaxed text-emerald-100/85">
                    <span className="text-emerald-400 font-bold">🎓 </span>{t.text}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <footer className="w-full py-8 px-6 flex items-center justify-center gap-6 relative z-20">
        
        {/* Mute Toggle */}
        <button
          onClick={toggleMute}
          disabled={voiceState === 'connecting' || voiceState === 'error' || voiceState === 'initial'}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            isMuted 
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
          title={isMuted ? (isAr ? "إلغاء الكتم" : "Unmute") : (isAr ? "كتم الصوت" : "Mute")}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleClose}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
          title={isAr ? "إنهاء المكالمة" : "End call"}
        >
          <PhoneOff className="w-7 h-7" />
        </button>

      </footer>

      {/* Guest Limit Modal Overlay */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161a26] border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                {isAr ? 'انتهت مدة التجربة اليومية للزوار' : 'Guest Daily Limit Reached'}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {isAr 
                  ? 'لقد استهلكت حد التجربة المجانية للزوار (3 دقائق) للمحادثة الصوتية المباشرة اليوم.' 
                  : 'You have reached the 3-minute daily limit for guest live voice conversation.'}
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-amber-200 mt-3 flex items-center gap-2 text-right">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  {isAr 
                    ? 'للمتابعة الآن دون انتظار 24 ساعة، يرجى تسجيل الدخول أو إنشاء حساب جديد.' 
                    : 'To continue without waiting 24 hours, please log in or register a free account.'}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                onClick={() => {
                  stopSession();
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}</span>
              </button>

              <button
                onClick={() => {
                  stopSession();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all"
              >
                {isAr ? 'إغلاق والانتظار 24 ساعة' : 'Close and wait 24 hours'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
