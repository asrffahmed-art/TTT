import { useState, useEffect } from 'react';
import { Sparkles, X, ExternalLink, Calendar, Tag, Share2, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppTheme } from '../lib/themeService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DailyBriefingModalProps {
  notificationId?: string | null;
  onClose: () => void;
}

export function DailyBriefingModal({ notificationId, onClose }: DailyBriefingModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const theme = useAppTheme();

  useEffect(() => {
    async function loadBriefing() {
      setLoading(true);
      setError(null);
      try {
        if (notificationId) {
          const snap = await getDoc(doc(db, 'dailyNotifications', notificationId));
          if (snap.exists()) {
            setData({ id: snap.id, ...snap.data() });
            setLoading(false);
            return;
          }
        }

        // Fetch latest daily notification from API
        const res = await fetch('/api/daily-notifications');
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const result = await res.json().catch(() => ({}));
          if (result.items && result.items.length > 0) {
            setData(result.items[0]);
          } else {
            setError('لا توجد إشعارات يومية مسجلة حتى الآن. يمكنك تشغيل المحرك اليومي من الإعدادات.');
          }
        } else {
          setError('تعذر تحميل بيانات الإشعار اليومي.');
        }
      } catch (err: any) {
        console.error('Error loading daily briefing:', err);
        setError('حدث خطأ أثناء جلب ملخص اليوم.');
      } finally {
        setLoading(false);
      }
    }

    loadBriefing();
  }, [notificationId]);

  const handleShare = () => {
    if (navigator.share && data) {
      navigator.share({
        title: data.title || 'THOTH Daily',
        text: data.headline || data.body,
        url: window.location.origin + '/?dailyId=' + (data.id || '')
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin + '/?dailyId=' + (data?.id || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
      <div className={`relative w-full max-w-2xl bg-[#141824] border ${theme.borderAccent} rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]`}>
        
        {/* Background glow */}
        <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full ${theme.ambientLight1} blur-3xl pointer-events-none`}></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${theme.previewGradient} flex items-center justify-center text-white shadow-lg`}>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>THOTH Daily Briefing</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} font-mono`}>
                  حدث اليوم
                </span>
              </h3>
              <p className="text-xs text-white/50">أهم حدث ومعلومة تم اختيارها وتلخيصها بالذكاء الاصطناعي</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto py-5 px-1 hide-scrollbar relative z-10 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/60">
              <RefreshCw className={`w-8 h-8 ${theme.textAccent} animate-spin`} />
              <span className="text-xs font-bold">جاري تحميل حدث اليوم...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-bold text-red-200">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Event Header Banner */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent}`}>
                    <Tag className="w-3.5 h-3.5" />
                    {data.topic || 'الذكاء الاصطناعي'}
                  </span>
                  {data.createdAt && (
                    <span className="text-[11px] text-white/40 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {new Date(data.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white leading-relaxed">
                  {data.headline || data.title}
                </h2>

                <p className="text-xs text-white/70 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                  {data.body}
                </p>
              </div>

              {/* Comprehensive Summary */}
              {data.summary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className={`w-4 h-4 ${theme.textAccent}`} />
                    التفاصيل والتحليل الكامل
                  </h4>
                  <div className="text-sm text-white/90 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10 whitespace-pre-line">
                    {data.summary}
                  </div>
                </div>
              )}

              {/* Sources */}
              {data.sources && data.sources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">المصادر الموثوقة والموثقة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.sources.map((src: any, idx: number) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between group"
                      >
                        <div className="overflow-hidden text-right">
                          <span className="text-xs font-bold text-white block truncate group-hover:text-pink-300 transition-colors">
                            {src.title || src.domain || 'مصدر خارجي'}
                          </span>
                          <span className="text-[10px] text-white/40 block truncate dir-ltr">
                            {src.domain || src.url}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'تم نسخ الرابط!' : 'مشاركة الحدث'}</span>
          </button>

          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl ${theme.btnPrimary} font-bold text-xs transition-all shadow-lg active:scale-95`}
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
