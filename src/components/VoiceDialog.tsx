import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PhoneOff, Loader2, Volume2, Check, ChevronDown, RefreshCw, Play, Clock, Lock, LogIn, Sparkles, AlertCircle, GraduationCap, ScrollText, MessageSquare, MonitorUp, Video, X, Brain, Send
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { getDeviceId } from '../lib/otpService';
import { liveWsUrl } from '../services/wsUrl';
import { LiveCallEngine } from '../services/liveCallEngine';
import { VisualInputManager, VisualSourceState } from '../services/visualInputManager';

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

  // ─── [MULTIMODAL LIVE — Task 42] Chat + Screen + Camera + Extended Thinking
  // One logical Agent: the SAME Live session and the SAME conversation state
  // (`transcripts`) feed voice, typed chat and visual frames. Additive only.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [screenState, setScreenState] = useState<VisualSourceState>('off');
  const [cameraState, setCameraState] = useState<VisualSourceState>('off');
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const vimRef = useRef<VisualInputManager | null>(null);
  const resumptionHandleRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const pendingContextReplayRef = useRef(false);
  const lastUserPieceAtRef = useRef(0);
  const lastModelPieceAtRef = useRef(0);
  const [mediaHint, setMediaHint] = useState<string>('');
  const mediaHintTimerRef = useRef<any>(null);
  const transcriptsRef = useRef<{role: 'user'|'model', text: string}[]>([]);
  const extendedThinkingRef = useRef(false);
  useEffect(() => { transcriptsRef.current = transcripts; }, [transcripts]);

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

  const stopSession = (keepMedia = false) => {
    isSessionActiveRef.current = false;
    // Engine.stop() sends {type:'stop'}, closes the socket, tears down the mic
    // and playback graphs, and suspends the output context — silence is
    // guaranteed the moment the call ends.
    if (engineRef.current) {
      try { engineRef.current.stop(true); } catch (e) {}
    }
    // [MULTIMODAL LIVE] full resource cleanup — no orphan camera/screen
    // tracks, no hidden capture, no stale reconnect state. Media survives
    // ONLY a same-dialog voice-change restart (keepMedia).
    if (!keepMedia) {
      try { vimRef.current?.stopAll(); } catch (e) {}
      vimRef.current = null;
      setScreenState('off');
      setCameraState('off');
      setMediaHint('');
      if (mediaHintTimerRef.current) { clearTimeout(mediaHintTimerRef.current); mediaHintTimerRef.current = null; }
      setInteractionBusy(false);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      pendingContextReplayRef.current = false;
      resumptionHandleRef.current = '';
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
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      // [RECONNECT / HANDOFF] replay recent turns so the model continues the
      // SAME logical conversation on its new Live session.
      if (pendingContextReplayRef.current) {
        pendingContextReplayRef.current = false;
        try {
          const replay = transcriptsRef.current.slice(-6)
            .map(t => (t.role === 'user' ? 'المستخدم: ' : 'أنت: ') + t.text)
            .join('\n').slice(-2500);
          if (replay) engineRef.current?.sendRaw({ type: 'text', text: '【سياق المكالمة بعد إعادة الاتصال أو تبديل النموذج — استمر طبيعيًا دون تعليق عليه】\n' + replay, hidden: true });
        } catch {}
      }
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
    } else if (msg.type === 'input_transcription' && msg.text) {
      // [MULTIMODAL LIVE] user's voice lands in the SAME conversation state
      // the Chat layer renders — no second history.
      setTranscripts(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'user' && Date.now() - lastUserPieceAtRef.current < 5000) {
          const arr = [...prev];
          arr[arr.length - 1] = { role: 'user', text: (last.text + ' ' + msg.text).trim() };
          return arr;
        }
        return [...prev, { role: 'user', text: msg.text }];
      });
      lastUserPieceAtRef.current = Date.now();
    } else if (msg.type === 'output_transcription' && msg.text) {
      // [3.8 LIVE] native-audio models transcribe their speech ONLY through
      // this channel (modelTurn carries no text parts) — THOTH's voice lands
      // in the SAME conversation the Chat layer renders.
      setTranscripts(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model' && Date.now() - lastModelPieceAtRef.current < 5000) {
          const arr = [...prev];
          arr[arr.length - 1] = { role: 'model', text: (last.text + ' ' + msg.text).trim() };
          return arr;
        }
        return [...prev, { role: 'model', text: msg.text }];
      });
      lastModelPieceAtRef.current = Date.now();
    } else if (msg.type === 'turn_complete') {
      lastUserPieceAtRef.current = 0; // next voice piece opens a fresh user turn
      lastModelPieceAtRef.current = 0;
    } else if (msg.type === 'interaction_status' && msg.status) {
      // [EXTENDED THINKING LIFECYCLE] turnComplete is NOT completion: the
      // agent may keep reasoning/running tools after it. Only IDLE ends work.
      setInteractionBusy(String(msg.status) !== 'IDLE');
    } else if (msg.type === 'resumption_handle' && msg.handle) {
      resumptionHandleRef.current = String(msg.handle);
    } else if (msg.type === 'user_text') {
      // typed text was appended optimistically at send time — ignore echo
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
        // [RECONNECT] a transient WebSocket drop must not destroy the logical
        // conversation: resume with the last known session handle first.
        if (reconnectAttemptsRef.current < 2) {
          attemptReconnect();
        } else {
          stopSession();
        }
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

  // [MULTIMODAL LIVE] bind preview elements to the live capture streams
  useEffect(() => {
    const v = screenVideoRef.current;
    if (v) { try { v.srcObject = (screenState === 'active' ? vimRef.current?.getStream('screen') : null) || null; } catch {} }
  }, [screenState]);

  useEffect(() => {
    const v = cameraVideoRef.current;
    if (v) { try { v.srcObject = (cameraState === 'active' ? vimRef.current?.getStream('camera') : null) || null; } catch {} }
  }, [cameraState]);

  // Chat auto-scroll — never blocks the audio pipeline (simple DOM scroll)
  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcripts, chatOpen]);

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
    stopSession(true); // keep media sources alive across voice-change restarts
    // [MOBILE UNLOCK] best-effort pre-warm of both audio contexts while the
    // user's tap activation may still be valid (speaker + 16 kHz mic graph).
    try { getEngine().unlockAudio(); } catch {}
    isSessionActiveRef.current = true;
    setVoiceState('connecting');

    try {
      const userId = localStorage.getItem('app-user-id') || localStorage.getItem('thoth_user_id') || '';
      const deviceId = getDeviceId();
      const wsUrl = buildLiveUrl(voiceId);
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



  
  // ─── [MULTIMODAL LIVE] helpers ──────────────────────────────────────────

  const buildLiveUrl = (voiceId: string, opts?: { thinking?: boolean; resume?: boolean }) => {
    const userId = localStorage.getItem('app-user-id') || localStorage.getItem('thoth_user_id') || '';
    const deviceId = getDeviceId();
    const thinkingOn = opts?.thinking ?? extendedThinkingRef.current;
    const resume = (opts?.resume && resumptionHandleRef.current)
      ? `&resumeHandle=${encodeURIComponent(resumptionHandleRef.current)}` : '';
    return liveWsUrl(`/api/live-audio?voice=${encodeURIComponent(voiceId)}&userId=${encodeURIComponent(userId)}&deviceId=${encodeURIComponent(deviceId)}${teachTopic ? `&studyTopic=${encodeURIComponent(teachTopic)}` : ''}${thinkingOn ? '&thinking=1&thinkingLevel=high' : ''}${resume}`);
  };

  // [RECONNECT] transparent resume — same conversation, same mic, no repaint
  // of the dialog; context is replayed once the resumed session is ready.
  const attemptReconnect = () => {
    const engine = engineRef.current;
    if (!engine) { stopSession(); return; }
    reconnectAttemptsRef.current++;
    setReconnecting(true);
    pendingContextReplayRef.current = true;
    engine.reconnect(buildLiveUrl(selectedVoice.id, { resume: true }))
      .then(() => { /* live_ready completes the flow */ })
      .catch(() => {
        if (reconnectAttemptsRef.current < 2 && isSessionActiveRef.current) {
          setTimeout(() => { if (isSessionActiveRef.current) attemptReconnect(); }, 1500);
        } else {
          setReconnecting(false);
          stopSession();
          setVoiceState('error');
        }
      });
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || !isSessionActiveRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (!engine.sendRaw({ type: 'text', text })) return;
    setTranscripts(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setInteractionBusy(true);
  };

  const ensureVim = (): VisualInputManager => {
    if (!vimRef.current) {
      vimRef.current = new VisualInputManager({
        onFrame: (b64) => {
          const eng = engineRef.current;
          if (!eng || !isSessionActiveRef.current) return;
          if (eng.sendRaw({ type: 'image', mimeType: 'image/jpeg', data: b64 })) {
            try { eng.stats.imagesSent++; } catch {}
          }
        },
        onSourceChange: (source, state) => {
          if (source === 'screen') setScreenState(state); else setCameraState(state);
          // [PERMISSIONS UX] explicit transient states — never a stuck ON
          if (state === 'denied' || state === 'unavailable' || state === 'ended') {
            setMediaHint(source + '-' + state);
            if (mediaHintTimerRef.current) clearTimeout(mediaHintTimerRef.current);
            mediaHintTimerRef.current = setTimeout(() => setMediaHint(''), 4500);
          }
        }
      });
    }
    return vimRef.current;
  };

  const toggleScreenShare = () => {
    if (voiceState === 'initial' || voiceState === 'error') return;
    ensureVim().toggleScreen().catch(() => {});
  };

  const toggleCamera = () => {
    if (voiceState === 'initial' || voiceState === 'error') return;
    ensureVim().toggleCamera().catch(() => {});
  };

  // [MODEL HANDOFF SAFETY] user-controlled extended thinking: transparent
  // reconnect to the extended model — mic, media and the conversation all
  // survive; context is replayed on live_ready (one THOTH session).
  const toggleExtendedThinking = () => {
    const next = !extendedThinkingRef.current;
    extendedThinkingRef.current = next;
    setExtendedThinking(next);
    if (!isSessionActiveRef.current) return;
    setReconnecting(true);
    pendingContextReplayRef.current = true;
    engineRef.current?.reconnect(buildLiveUrl(selectedVoice.id, { thinking: next }))
      .then(() => { /* live_ready completes the flow */ })
      .catch(() => {
        extendedThinkingRef.current = !next;
        setExtendedThinking(!next);
        setReconnecting(false);
      });
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
        {/* [MULTIMODAL LIVE] compact status cluster — additive */}
        <div className="flex items-center gap-2 shrink-0">
          {reconnecting && (
            <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-full flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isAr ? 'إعادة اتصال...' : 'Reconnecting...'}
            </span>
          )}
          {interactionBusy && !reconnecting && (
            <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 rounded-full animate-pulse">
              {isAr ? 'بيشتغل...' : 'Working...'}
            </span>
          )}
          {extendedThinking && (
            <span className="text-[10px] font-black text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-1 rounded-full">
              🧠 {isAr ? 'تفكير موسّع' : 'Extended'}
            </span>
          )}
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

      {/* [PERMISSIONS UX] explicit transient media states */}
      {mediaHint && (
        <div className="w-full px-4 pb-1 relative z-10 text-center">
          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1">
            {mediaHint === 'screen-denied' && (isAr ? 'تم رفض إذن مشاركة الشاشة — الصوت والمحادثة شغالين عادي' : 'Screen permission denied — voice & chat still work')}
            {mediaHint === 'screen-unavailable' && (isAr ? 'مشاركة الشاشة غير مدعومة هنا — الصوت والمحادثة شغالين عادي' : 'Screen sharing unsupported here — voice & chat still work')}
            {mediaHint === 'screen-ended' && (isAr ? 'اتقفلت مشاركة الشاشة' : 'Screen sharing ended')}
            {mediaHint === 'camera-denied' && (isAr ? 'تم رفض إذن الكاميرا — الصوت والمحادثة شغالين عادي' : 'Camera permission denied — voice & chat still work')}
            {mediaHint === 'camera-unavailable' && (isAr ? 'الكاميرا غير متاحة — الصوت والمحادثة شغالين عادي' : 'Camera unavailable — voice & chat still work')}
            {mediaHint === 'camera-ended' && (isAr ? 'الكاميرا اتقفلت' : 'Camera ended')}
          </span>
        </div>
      )}

      {/* [MULTIMODAL LIVE] media previews — screen / camera */}
      {(screenState === 'active' || cameraState === 'active') && (
        <div className="w-full px-4 pb-2 relative z-10 flex items-end justify-center gap-3 flex-wrap">
          {screenState === 'active' && (
            <div className="relative w-44 rounded-xl overflow-hidden border border-emerald-500/30 bg-black/40 shadow-lg">
              <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-24 object-cover" />
              <span className="absolute top-1 start-1 text-[9px] font-black text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded">{isAr ? 'شاشة' : 'Screen'}</span>
              <button onClick={toggleScreenShare} className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center" title={isAr ? 'إيقاف مشاركة الشاشة' : 'Stop screen sharing'}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {cameraState === 'active' && (
            <div className="relative w-44 rounded-xl overflow-hidden border border-emerald-500/30 bg-black/40 shadow-lg">
              <video ref={cameraVideoRef} autoPlay muted playsInline className="w-full h-24 object-cover" />
              <span className="absolute top-1 start-1 text-[9px] font-black text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded">{isAr ? 'كاميرا' : 'Camera'}</span>
              <button onClick={toggleCamera} className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center" title={isAr ? 'إيقاف الكاميرا' : 'Stop camera'}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* [MULTIMODAL LIVE] Chat layer — the SAME conversation, additive UI */}
      {chatOpen && (
        <div className="w-full px-4 pb-2 relative z-10">
          <div className="max-w-xl mx-auto bg-white/[0.04] border border-indigo-500/20 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-indigo-500/15 bg-indigo-500/[0.06]">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-black text-indigo-200">{isAr ? 'المحادثة النصية' : 'Live chat'}</span>
              {interactionBusy && (
                <span className="text-[9px] font-black text-indigo-300/80 animate-pulse">{isAr ? 'بيفكر / بيشتغل...' : 'working...'}</span>
              )}
              <button
                onClick={toggleExtendedThinking}
                className={`ms-auto text-[9px] font-black px-2 py-1 rounded-full border transition-all flex items-center gap-1 ${
                  extendedThinking
                    ? 'text-purple-200 bg-purple-500/20 border-purple-500/40'
                    : 'text-white/50 bg-white/5 border-white/10 hover:text-white/80'
                }`}
                title={isAr ? 'نموذج التفكير الموسّع للمهام المعقدة' : 'Extended-thinking model for complex tasks'}
              >
                <Brain className="w-3 h-3" />
                {isAr ? 'تفكير موسّع' : 'Extended'}
              </button>
              <button onClick={() => setChatOpen(false)} className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center" title={isAr ? 'إغلاق المحادثة' : 'Close chat'}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div ref={chatScrollRef} className="max-h-52 overflow-y-auto px-4 py-3 space-y-2 hide-scrollbar" dir={isAr ? 'rtl' : 'ltr'}>
              {transcripts.filter(t => t.text && t.text.trim()).length === 0 ? (
                <p className="text-[11px] text-white/35 text-center py-3">
                  {isAr ? 'اكتب رسالة أو اتكلم عادي — كل حاجة هتظهر هنا 💬' : 'Type a message or just speak — everything shows here 💬'}
                </p>
              ) : (
                transcripts.filter(t => t.text && t.text.trim()).map((t, i) => (
                  t.role === 'user' ? (
                    <div key={i} className="flex justify-end" dir={isAr ? 'rtl' : 'ltr'}>
                      <p className="max-w-[85%] text-[11px] leading-relaxed text-indigo-100 bg-indigo-500/15 border border-indigo-500/25 rounded-xl px-3 py-1.5">
                        <span className="font-bold text-indigo-300">{isAr ? 'أنت: ' : 'You: '}</span>{t.text}
                      </p>
                    </div>
                  ) : (
                    <p key={i} className="text-[11px] leading-relaxed text-white/85" dir={isAr ? 'rtl' : 'ltr'}>
                      <span className="text-indigo-400 font-bold">THOTH: </span>{t.text}
                    </p>
                  )
                ))
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t border-indigo-500/10">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                placeholder={isAr ? 'اكتب لـ THOTH...' : 'Type to THOTH...'}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500/40"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || voiceState !== 'listening' && voiceState !== 'speaking'}
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 active:scale-95 transition-all"
                title={isAr ? 'إرسال' : 'Send'}
              >
                <Send className={`w-4 h-4 ${isAr ? '-scale-x-100' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <footer className="w-full py-8 px-6 flex items-center justify-center gap-6 relative z-20">
        
        {/* [MULTIMODAL LIVE] Chat / Screen / Camera — compact additive controls */}
        <button
          onClick={() => setChatOpen(v => !v)}
          disabled={voiceState === 'connecting' || voiceState === 'error' || voiceState === 'initial'}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            chatOpen
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
          title={isAr ? 'المحادثة النصية' : 'Chat'}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button
          onClick={toggleScreenShare}
          disabled={voiceState === 'connecting' || voiceState === 'error' || voiceState === 'initial'}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            screenState === 'active'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
          title={isAr ? 'مشاركة الشاشة' : 'Share screen'}
        >
          <MonitorUp className="w-5 h-5" />
        </button>
        <button
          onClick={toggleCamera}
          disabled={voiceState === 'connecting' || voiceState === 'error' || voiceState === 'initial'}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            cameraState === 'active'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
          }`}
          title={isAr ? 'الكاميرا' : 'Camera'}
        >
          <Video className="w-5 h-5" />
        </button>

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
