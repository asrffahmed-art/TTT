import { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Cpu, 
  Lock, 
  Check, 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  AlertTriangle, 
  UserCheck, 
  FolderLock, 
  Megaphone, 
  Cookie, 
  CreditCard, 
  Ban, 
  UserX, 
  History, 
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { useAppTheme } from '../lib/themeService';
import { useLanguage } from '../lib/LanguageContext';
import { getLegalDocumentConfig, LegalDocumentConfig } from '../lib/legalService';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function TermsAndPrivacyModal({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false
}: TermsAndPrivacyModalProps) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'all' | 'terms' | 'privacy' | 'ai_training' | 'advertising'>('all');
  const [legalConfig, setLegalConfig] = useState<LegalDocumentConfig | null>(null);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getLegalDocumentConfig().then((cfg) => {
        setLegalConfig(cfg);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sections = legalConfig?.sections || [];

  // Map icon strings to Lucide Components
  const renderIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'FileCheck': return <FileCheck className={className} />;
      case 'UserCheck': return <UserCheck className={className} />;
      case 'Cpu': return <Cpu className={className} />;
      case 'AlertTriangle': return <AlertTriangle className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'FolderLock': return <FolderLock className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Megaphone': return <Megaphone className={className} />;
      case 'Cookie': return <Cookie className={className} />;
      case 'CreditCard': return <CreditCard className={className} />;
      case 'Ban': return <Ban className={className} />;
      case 'UserX': return <UserX className={className} />;
      case 'History': return <History className={className} />;
      case 'HelpCircle': return <HelpCircle className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // Filter sections by category tab
  const filteredSections = sections.filter((sec) => {
    if (activeTab === 'terms') {
      return ['acceptance', 'account', 'services', 'ai_disclaimer', 'user_content', 'prohibited_use', 'modifications', 'contact'].includes(sec.id);
    } else if (activeTab === 'privacy') {
      return ['privacy_policy', 'files_data', 'cookies', 'termination', 'contact'].includes(sec.id);
    } else if (activeTab === 'ai_training') {
      return ['ai_training', 'ai_disclaimer', 'services'].includes(sec.id);
    } else if (activeTab === 'advertising') {
      return ['advertising', 'cookies', 'privacy_policy'].includes(sec.id);
    }
    return true;
  });

  const handleCopySectionLink = (secId: string) => {
    const url = `${window.location.origin}/?legalSection=${secId}`;
    navigator.clipboard.writeText(url);
    setCopiedSectionId(secId);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-xl h-[88vh] sm:h-[82vh] bg-[#121624] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {isAr ? 'الشروط والسياسات القانونية' : 'Terms & Legal Policies'}
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                v{legalConfig?.termsVersion || '1.1'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Category Segmented Control */}
        <div className="px-2.5 py-1.5 border-b border-white/10 bg-black/20 flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              activeTab === 'all'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>{isAr ? 'الكل' : 'All'}</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              activeTab === 'terms'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>{isAr ? 'الشروط' : 'Terms'}</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              activeTab === 'privacy'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>{isAr ? 'الخصوصية' : 'Privacy'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_training')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              activeTab === 'ai_training'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>{isAr ? 'تدريب AI' : 'AI Training'}</span>
          </button>

          <button
            onClick={() => setActiveTab('advertising')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              activeTab === 'advertising'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Megaphone className="w-3 h-3 text-purple-400" />
            <span>{isAr ? 'الإعلانات' : 'Ads'}</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 hide-scrollbar">
          {filteredSections.map((sec) => {
            const title = isAr ? sec.titleAr : (sec.titleEn || sec.titleAr);
            const summary = isAr ? sec.summaryAr : (sec.summaryEn || sec.summaryAr);
            const contentLines = isAr ? sec.contentAr : (sec.contentEn || sec.contentAr);
            const badge = isAr ? sec.badgeAr : (sec.badgeEn || sec.badgeAr);
            const card = isAr ? sec.highlightCardAr : (sec.highlightCardEn || sec.highlightCardAr);

            return (
              <div
                key={sec.id}
                id={`legal-sec-${sec.id}`}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden p-3 space-y-2"
              >
                {/* Header inside card */}
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      {renderIcon(sec.iconName, "w-3 h-3")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-mono text-[11px] font-bold text-purple-400">{sec.number}.</span>
                        <h3 className="text-xs font-bold text-white truncate">{title}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/80 border border-white/10">
                        {badge}
                      </span>
                    )}
                    <button
                      onClick={() => handleCopySectionLink(sec.id)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                      title={isAr ? "نسخ الرابط" : "Copy Link"}
                    >
                      {copiedSectionId === sec.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Brief Summary if exists */}
                {summary && (
                  <p className="text-[11px] text-purple-200/80 font-medium leading-tight">
                    {summary}
                  </p>
                )}

                {/* Clean Paragraphs */}
                <div className="space-y-1 text-[11px] sm:text-xs text-white/85 leading-relaxed">
                  {contentLines.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 py-0.5">
                      <span className="text-purple-400 font-bold select-none mt-0.5">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                {/* Highlight Alert Card */}
                {card && (
                  <div className={`p-2 rounded-lg border flex items-start gap-2 text-[11px] mt-1 ${
                    card.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : card.type === 'shield'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                      : card.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                  }`}>
                    <div className="p-0.5 rounded bg-white/10 shrink-0 mt-0.5">
                      {card.type === 'warning' ? <AlertTriangle className="w-3 h-3 text-amber-400" /> :
                       card.type === 'shield' ? <ShieldCheck className="w-3 h-3 text-indigo-400" /> :
                       card.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                       <Sparkles className="w-3 h-3 text-purple-400" />}
                    </div>
                    <div>
                      <strong className="block font-bold text-white text-[11px]">{card.title}</strong>
                      <span className="opacity-90">{card.description}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-3 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-white/50 truncate">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{isAr ? 'الاستخدام يعتبر إقراراً بالشروط الرسمية.' : 'Usage constitutes official acknowledgment.'}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>

            {showAcceptButton && onAccept && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className={`px-4 py-1.5 rounded-lg ${theme.btnPrimary} font-bold text-xs shadow-md flex items-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer`}
              >
                <Check className="w-3 h-3" />
                <span>{isAr ? 'موافقة' : 'Accept'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
