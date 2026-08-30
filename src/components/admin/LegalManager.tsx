import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Check, 
  FileText, 
  History, 
  Edit3, 
  Plus, 
  Trash2, 
  Eye, 
  Globe,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAppTheme } from '../../lib/themeService';
import { 
  getLegalDocumentConfig, 
  publishLegalDocumentConfig, 
  LegalDocumentConfig, 
  LegalSection 
} from '../../lib/legalService';

export function LegalManager() {
  const theme = useAppTheme();
  const [config, setConfig] = useState<LegalDocumentConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('acceptance');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    loadLegalData();
  }, []);

  const loadLegalData = async () => {
    setLoading(true);
    const cfg = await getLegalDocumentConfig();
    setConfig(cfg);
    if (cfg.sections && cfg.sections.length > 0) {
      setActiveSectionId(cfg.sections[0].id);
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!config) return;
    setSaving(true);
    setSaveSuccess(false);

    const userEmail = localStorage.getItem('app-user-email') || 'admin@thoth.app';
    const success = await publishLegalDocumentConfig(config, userEmail);

    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const activeSection = config?.sections.find(s => s.id === activeSectionId);

  const updateActiveSection = (updatedFields: Partial<LegalSection>) => {
    if (!config) return;
    const newSections = config.sections.map(sec => {
      if (sec.id === activeSectionId) {
        return { ...sec, ...updatedFields };
      }
      return sec;
    });
    setConfig({ ...config, sections: newSections });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-white/60 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-xs font-bold">جاري تحميل إعدادات الوثائق القانونية وشروط الخدمة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-black/40 border border-purple-500/30 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl ${theme.bgAccent} ${theme.textAccent} border ${theme.borderAccent} shadow-xl shrink-0`}>
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">إدارة الوثائق والسياسات القانونية (Legal Center)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                مباشر في النظام
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              التحكم الكامل في شروط الاستخدام، سياسة الخصوصية، نظام التدريب، والنسخ المنشورة للمستخدمين.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={loadLegalData}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تحميل</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={saving}
            className={`px-6 py-2.5 rounded-xl ${theme.btnPrimary} font-bold text-xs shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'تم النشر بنجاح!' : 'نشر الإصدار الجديد'}</span>
          </button>
        </div>
      </div>

      {/* Version Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1.5">
            إصدار شروط الاستخدام (Terms Version)
          </label>
          <input
            type="text"
            value={config?.termsVersion || '1.1'}
            onChange={(e) => setConfig(prev => prev ? { ...prev, termsVersion: e.target.value } : null)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1.5">
            إصدار سياسة الخصوصية (Privacy Version)
          </label>
          <input
            type="text"
            value={config?.privacyVersion || '1.1'}
            onChange={(e) => setConfig(prev => prev ? { ...prev, privacyVersion: e.target.value } : null)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1.5">
            تاريخ آخر تحديث (Last Updated)
          </label>
          <input
            type="date"
            value={config?.lastUpdated || '2026-08-09'}
            onChange={(e) => setConfig(prev => prev ? { ...prev, lastUpdated: e.target.value } : null)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Section Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sections Sidebar */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10 mb-2">
            <span className="text-xs font-bold text-white/70">أقسام العقد والسياسات</span>
            <span className="text-xs font-mono text-purple-400 font-bold">{config?.sections.length || 0} بنود</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[500px] hide-scrollbar">
            {config?.sections.map((sec) => {
              const isActive = sec.id === activeSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`w-full text-right p-3 rounded-2xl text-xs transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/30 border-purple-500/50 text-white font-bold shadow-lg'
                      : 'bg-white/[0.02] hover:bg-white/10 text-white/70 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[11px] text-purple-400 font-bold shrink-0">{sec.number}</span>
                    <span className="truncate">{sec.titleAr}</span>
                  </div>
                  {sec.badgeAr && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 shrink-0 font-bold">
                      {sec.badgeAr}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Editor Form */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5 backdrop-blur-md">
          {activeSection ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-400 text-sm">{activeSection.number}.</span>
                  <h3 className="text-base font-bold text-white">تعديل البند: {activeSection.titleAr}</h3>
                </div>
                <span className="text-[10px] font-mono text-white/40">ID: {activeSection.id}</span>
              </div>

              {/* Titles Ar & En */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">العنوان بالعربية</label>
                  <input
                    type="text"
                    value={activeSection.titleAr}
                    onChange={(e) => updateActiveSection({ titleAr: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">Title in English</label>
                  <input
                    type="text"
                    value={activeSection.titleEn}
                    onChange={(e) => updateActiveSection({ titleEn: e.target.value })}
                    dir="ltr"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 text-left"
                  />
                </div>
              </div>

              {/* Summaries Ar & En */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">الملخص بالعربية</label>
                  <input
                    type="text"
                    value={activeSection.summaryAr}
                    onChange={(e) => updateActiveSection({ summaryAr: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">Summary in English</label>
                  <input
                    type="text"
                    value={activeSection.summaryEn}
                    onChange={(e) => updateActiveSection({ summaryEn: e.target.value })}
                    dir="ltr"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 text-left"
                  />
                </div>
              </div>

              {/* Badges Ar & En */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">الشارة بالعربية (اختياري)</label>
                  <input
                    type="text"
                    value={activeSection.badgeAr || ''}
                    onChange={(e) => updateActiveSection({ badgeAr: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">Badge in English</label>
                  <input
                    type="text"
                    value={activeSection.badgeEn || ''}
                    onChange={(e) => updateActiveSection({ badgeEn: e.target.value })}
                    dir="ltr"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 text-left"
                  />
                </div>
              </div>

              {/* Paragraphs Arabic */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">
                  فقرات النص بالعربية (كل سطر يعتبر فقرة منفصلة)
                </label>
                <textarea
                  rows={4}
                  value={activeSection.contentAr.join('\n\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n\n').map(s => s.trim()).filter(Boolean);
                    updateActiveSection({ contentAr: lines });
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Paragraphs English */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-1">
                  Content Paragraphs in English (Double newline separates paragraphs)
                </label>
                <textarea
                  rows={4}
                  value={activeSection.contentEn.join('\n\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n\n').map(s => s.trim()).filter(Boolean);
                    updateActiveSection({ contentEn: lines });
                  }}
                  dir="ltr"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed outline-none focus:border-purple-500 resize-none text-left"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-white/40 text-xs">
              اختر بنداً من القائمة الجانبية لتعديل نصوصه.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
