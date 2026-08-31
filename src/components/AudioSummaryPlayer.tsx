import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle, Clock, Radio, Headphones } from 'lucide-react';
import { useAppTheme } from '../lib/themeService';

interface AudioSummaryPlayerProps {
  audioUrl?: string;
  title?: string;
  duration?: number | string;
  voiceName?: string;
  script?: string;
  status?: 'generating' | 'ready' | 'error' | 'limit_reached';
  sourceType?: 'pdf' | 'youtube' | 'image' | 'audio' | 'document' | 'text';
  onRetry?: () => void;
}

export function AudioSummaryPlayer({
  audioUrl,
  title = 'ملخص صوتي ذكي',
  duration,
  voiceName,
  script,
  status = 'ready',
  sourceType,
  onRetry
}: AudioSummaryPlayerProps) {
  const theme = useAppTheme();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(typeof duration === 'number' ? duration : 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showScript, setShowScript] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Parse initial duration string if format like "02:30"
  useEffect(() => {
    if (typeof duration === 'string' && duration.includes(':')) {
      const parts = duration.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setTotalDuration(parts[0] * 60 + parts[1]);
      }
    } else if (typeof duration === 'number' && duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  // Speech synthesis fallback ref
  const synthTimerRef = useRef<any>(null);

  // Initialize totalDuration from script length if not set
  useEffect(() => {
    if (!totalDuration && script) {
      const estimatedSec = Math.max(5, Math.round(script.length / 14));
      setTotalDuration(estimatedSec);
    }
  }, [script, totalDuration]);

  // Audio lifecycle handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioUrl]);

  // SpeechSynthesis handler cleanup
  useEffect(() => {
    return () => {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const togglePlay = () => {
    // 1. Native Audio tag playback if audioUrl exists
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.warn('Audio playback error:', err);
        });
      }
      return;
    }

    // 2. Web Speech Synthesis Fallback if audioUrl is missing but script exists
    if (script && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        setIsPlaying(false);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.lang = 'ar-SA';
        utterance.rate = playbackRate;
        utterance.pitch = voiceName?.includes('بنت') || voiceName?.includes('أنثى') ? 1.15 : 0.95;

        // Try to pick an Arabic voice if available
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Tarık') || v.name.includes('Maged') || v.name.includes('Laila') || v.name.includes('Salma'));
        if (arVoice) {
          utterance.voice = arVoice;
        }

        const estDuration = Math.max(5, Math.round(script.length / 14));
        setTotalDuration(estDuration);

        utterance.onstart = () => {
          setIsPlaying(true);
          setCurrentTime(0);
          if (synthTimerRef.current) clearInterval(synthTimerRef.current);
          synthTimerRef.current = setInterval(() => {
            setCurrentTime(prev => {
              if (prev >= estDuration) {
                clearInterval(synthTimerRef.current);
                return estDuration;
              }
              return prev + 0.25;
            });
          }, 250);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        };

        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = newTime;
    }
  };

  const togglePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;
    try {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `thoth_audio_summary_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      window.open(audioUrl, '_blank');
    }
  };

  // State 1: Generating Audio
  if (status === 'generating') {
    return (
      <div 
        className="my-3 w-full max-w-xl rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-3.5 shadow-lg select-none transition-all duration-300" 
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 animate-spin text-white" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate">{title}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/15 animate-pulse">
                جاري التوليد...
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">تحضير ملخص صوتي طبيعي بالصوت والنبرة المناسبة</p>
          </div>
        </div>

        {/* Clean Equalizer */}
        <div className="flex items-center justify-between gap-1 h-6 mt-3 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
          {[40, 70, 30, 90, 50, 80, 60, 100, 45, 75, 35, 85, 55, 65, 45, 80, 60, 90, 50, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 max-w-[3px] rounded-full bg-white/40 animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${(i * 0.08).toFixed(2)}s`,
                animationDuration: '0.8s'
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // State 2: Daily Limit Reached
  if (status === 'limit_reached') {
    return (
      <div className="my-3 w-full max-w-xl rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 p-3.5 shadow-lg select-none" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 border border-amber-500/30">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-bold text-amber-200 text-xs">الحد اليومي للملخصات الصوتية</div>
            <p className="text-amber-300/80 text-[11px] mt-1 leading-relaxed">
              الرصيد بيتجدد تلقائياً منتصف الليل بتوقيت القاهرة 🕛، أو يمكنك الترقية لملخصات صوتية غير محدودة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Error State only if NO audio AND NO script available
  if (status === 'error' && !audioUrl && !script) {
    return (
      <div className="my-3 w-full max-w-xl rounded-2xl bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 p-3.5 shadow-lg select-none" dir="rtl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-medium">تعذر توليد المقطع الصوتي حالياً. يرجى المحاولة لاحقاً.</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 text-xs font-semibold transition-all shrink-0 border border-rose-500/30 active:scale-95 shadow-sm"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    );
  }

  // State 4: Ready & Playing (Unified Minimalist Theme Match)
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div 
      className="my-3 w-full max-w-xl rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-xl transition-all duration-300 p-3.5 select-none" 
      dir="rtl"
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Header Info Bar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Minimal Play / Sound Icon */}
          <button 
            type="button"
            onClick={togglePlay}
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
              isPlaying 
                ? 'bg-white text-gray-900 shadow-md scale-105' 
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate">
                {title}
              </span>
              {sourceType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-gray-300 uppercase tracking-wider font-mono">
                  {sourceType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {voiceName && (
                <span className="text-[11px] text-gray-400">
                  صوت: {voiceName}
                </span>
              )}
              {totalDuration > 0 && (
                <span className="text-[11px] text-gray-500 font-mono">
                  • {formatTime(totalDuration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
            title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={togglePlaybackRate}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-gray-300 hover:text-white transition-all active:scale-95"
            title="تغيير سرعة الصوت"
          >
            {playbackRate}x
          </button>

          {audioUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
              title="تحميل الملف الصوتي (WAV)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Waveform & Scrubber */}
      <div className="space-y-1.5">
        <div className="relative flex items-center h-7 px-1.5 bg-black/20 rounded-xl border border-white/5 group">
          {/* 30-Bar Soundwave Graphic */}
          <div className="absolute inset-0 flex items-center justify-between gap-1 px-2 pointer-events-none">
            {[30, 50, 80, 45, 90, 60, 35, 70, 100, 55, 40, 85, 65, 45, 90, 75, 30, 60, 80, 50, 35, 70, 95, 40, 60, 85, 30, 50, 75, 40].map((h, i) => {
              const isPast = (i / 30) * 100 <= progressPercent;
              const dynamicHeight = isPlaying 
                ? Math.min(100, Math.max(25, h * (0.6 + Math.sin(currentTime * 4 + i) * 0.35))) 
                : h * 0.7;

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPast 
                      ? 'bg-white/90 shadow-sm' 
                      : 'bg-white/15'
                  }`}
                  style={{
                    height: `${dynamicHeight}%`
                  }}
                />
              );
            })}
          </div>

          {/* Transparent Range Input Slider on Top */}
          <input
            type="range"
            min={0}
            max={totalDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 appearance-none bg-transparent cursor-pointer relative z-10 accent-white focus:outline-none opacity-0 group-hover:opacity-30 transition-opacity"
          />
        </div>

        {/* Playback Controls & Time Bar */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-gray-200 font-semibold">{formatTime(currentTime)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{formatTime(totalDuration)}</span>
          </div>

          {/* Script Drawer Toggle */}
          {script && (
            <button
              type="button"
              onClick={() => setShowScript(!showScript)}
              className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white transition-colors"
            >
              <FileText className="w-3 h-3 text-gray-400" />
              <span>{showScript ? 'إخفاء النص' : 'عرض النص المنطوق'}</span>
              {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Spoken Script Drawer */}
      {showScript && script && (
        <div className="mt-3 pt-2.5 border-t border-white/10 animate-in fade-in duration-200">
          <div className="rounded-xl bg-black/20 p-3 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/10 text-[11px] font-semibold text-gray-300">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-400" />
                النص الكامل للملخص الصوتي:
              </span>
              <span className="font-mono text-[10px] text-gray-500">{script.length} حرف</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
              {script}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
