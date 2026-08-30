import { Search, Trash2, X, Image as ImageIcon, Video, Volume2, Pin, MessageSquare, Plus, Edit2, Check, Share2, Sparkles, Clock, Bot, RefreshCw, History as HistoryIcon, Layers, ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useAppTheme } from '../lib/themeService';
import { useState, useEffect } from 'react';
import { 
  ChatSession, 
  loadAllSessions, 
  deleteSession, 
  renameSession, 
  togglePinSession, 
  clearAllSessions, 
  createNewSession,
  setActiveSessionId,
  getActiveSessionId,
  isUserAuthenticated
} from '../lib/chatSessionManager';

interface HistoryProps {
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
  onAction?: (msg: string) => void;
  onBack?: () => void;
}

export function History({ onSelectChat, onNewChat, onAction, onBack }: HistoryProps) {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'media' | 'today'>('all');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentActiveId, setCurrentActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const activeId = getActiveSessionId();
      setCurrentActiveId(activeId);
      const list = await loadAllSessions();
      setSessions(list);
    } catch (e) {
      console.error('Error fetching sessions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const handleSessionsUpdated = (e: any) => {
      if (e.detail?.sessions) {
        setSessions(e.detail.sessions);
      }
      setCurrentActiveId(getActiveSessionId());
    };

    window.addEventListener('thoth_sessions_list_updated', handleSessionsUpdated);
    return () => window.removeEventListener('thoth_sessions_list_updated', handleSessionsUpdated);
  }, []);

  const handleOpenChat = (id: string, title?: string) => {
    setActiveSessionId(id);
    if (onSelectChat) {
      onSelectChat(id);
    } else if (onAction) {
      onAction(title || 'محادثة سابقة');
    }
  };

  const handleStartNew = () => {
    const newSession = createNewSession();
    if (onSelectChat) {
      onSelectChat(newSession.id);
    } else if (onNewChat) {
      onNewChat();
    }
  };

  const handleStartEditing = (item: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingTitle.trim()) return;

    await renameSession(id, editingTitle.trim());
    setEditingId(null);
  };

  const handleTogglePin = async (id: string, currentPin: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinSession(id, currentPin);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDeleteId(null);
    setSessions(prev => prev.filter(s => s.id !== id));
    await deleteSession(id);
  };

  const handleClearAll = async () => {
    setShowClearAllModal(false);
    setSessions([]);
    await clearAllSessions();
  };

  const handleShareChat = (item: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `محادثة THOTH AI:\nالعنوان: ${item.title}\n${item.desc || ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Date categorization helper
  const isToday = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    } catch {
      return false;
    }
  };

  const isYesterday = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    } catch {
      return false;
    }
  };

  // Filter items
  const filteredSessions = sessions.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      item.title.toLowerCase().includes(query) || 
      (item.desc && item.desc.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (activeFilter === 'pinned') return item.isPinned;
    if (activeFilter === 'media') return item.hasMedia || item.lastMediaType === 'image' || item.lastMediaType === 'video' || item.lastMediaType === 'audio';
    if (activeFilter === 'today') return isToday(item.updatedAt || item.createdAt);

    return true;
  });

  const pinnedList = filteredSessions.filter(i => i.isPinned);
  const unpinnedList = filteredSessions.filter(i => !i.isPinned);

  const todayList = unpinnedList.filter(i => isToday(i.updatedAt || i.createdAt));
  const yesterdayList = unpinnedList.filter(i => isYesterday(i.updatedAt || i.createdAt));
  const olderList = unpinnedList.filter(i => !isToday(i.updatedAt || i.createdAt) && !isYesterday(i.updatedAt || i.createdAt));

  const totalChats = sessions.length;
  const totalMediaChats = sessions.filter(i => i.hasMedia || i.lastMediaType === 'image' || i.lastMediaType === 'video').length;
  const totalPinned = sessions.filter(i => i.isPinned).length;

  const renderChatCard = (item: ChatSession) => {
    const isEditing = editingId === item.id;
    const isActive = item.id === currentActiveId;
    const isVid = item.lastMediaType === 'video';
    const isImg = item.lastMediaType === 'image' || (!isVid && !!item.lastMediaThumbnail);
    const isAud = item.lastMediaType === 'audio';

    const formattedTime = (() => {
      try {
        const d = new Date(item.updatedAt || item.createdAt);
        if (isNaN(d.getTime())) return '';
        if (isToday(item.updatedAt || item.createdAt)) {
          return `${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (isYesterday(item.updatedAt || item.createdAt)) {
          return `أمس ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      } catch (e) {
        return '';
      }
    })();

    return (
      <div 
        key={item.id} 
        onClick={() => !isEditing && handleOpenChat(item.id, item.title)} 
        className={`group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-md ${
          isActive
            ? `bg-white/10 ${theme.borderAccent} text-white shadow-lg ring-1 ring-white/10`
            : item.isPinned
            ? 'bg-white/[0.07] hover:bg-white/10 border-white/20 text-gray-200 shadow-sm'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 shadow-sm'
        } active:scale-[0.99]`}
      >
        {/* Left icon / Thumbnail */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden backdrop-blur-md transition-transform group-hover:scale-105 ${
            item.lastMediaThumbnail ? 'border-white/20 shadow-sm' :
            isActive ? `${theme.bgAccent} ${theme.textAccent} ${theme.borderAccent} shadow-sm` : 
            isVid ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
            isImg ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
            isAud ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' :
            'bg-white/5 text-white/70 border-white/10'
          }`}>
            {item.lastMediaThumbnail ? (
              <img src={item.lastMediaThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : item.isPinned ? (
              <Pin className={`w-4 h-4 fill-current ${theme.textAccent}`} />
            ) : isVid ? (
              <Video className="w-4 h-4 text-purple-400" />
            ) : isImg ? (
              <ImageIcon className="w-4 h-4 text-indigo-400" />
            ) : isAud ? (
              <Volume2 className="w-4 h-4 text-pink-400" />
            ) : (
              <MessageSquare className={`w-4 h-4 ${theme.textAccent}`} />
            )}
          </div>

          {/* Title & Preview Content */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form onSubmit={(e) => handleSaveRename(item.id, e)} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text" 
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  autoFocus
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button 
                  type="submit" 
                  className={`p-1.5 rounded-xl ${theme.btnPrimary} text-white shrink-0 shadow-md`}
                  title="حفظ"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingId(null)} 
                  className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 shrink-0"
                  title="إلغاء"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                    {item.title}
                  </h3>
                  {item.isPinned && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${theme.badgeClass} flex items-center gap-1 shrink-0 font-bold`}>
                      <Pin className="w-2.5 h-2.5 fill-current" />
                    </span>
                  )}
                  {isVid ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold shrink-0">
                      فيديو
                    </span>
                  ) : isImg ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold shrink-0">
                      صورة
                    </span>
                  ) : null}
                  {item.isFirestore && (
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0 hidden sm:inline-block">
                      سحابي
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 block truncate mt-1 max-w-[95%]">
                  {item.desc || (language === 'ar' ? 'جلسة محادثة ذكاء اصطناعي' : 'Chat session')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {formattedTime && (
            <span className="text-[10px] text-white/40 font-medium hidden sm:inline-block">
              {formattedTime}
            </span>
          )}

          {/* Action buttons */}
          {!isEditing && (
            confirmDeleteId === item.id ? (
              <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 p-1 rounded-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-bold text-red-200 px-1 hidden xs:inline-block">تأكيد الحذف؟</span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="تأكيد الحذف"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                  className="p-1 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-all cursor-pointer"
                  title="إلغاء"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(item.id, item.isPinned, e)}
                  className={`p-1.5 rounded-xl hover:bg-white/10 transition-colors ${item.isPinned ? theme.textAccent : 'text-white/50 hover:text-white'}`}
                  title={item.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleStartEditing(item, e)}
                  className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="تعديل العنوان"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleShareChat(item, e)}
                  className={`p-1.5 rounded-xl hover:bg-white/10 transition-colors ${copiedId === item.id ? 'text-emerald-400' : 'text-white/50 hover:text-white'}`}
                  title="مشاركة"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                  className="p-1.5 sm:p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/25 bg-red-500/15 border border-red-500/30 transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="حذف هذه المحادثة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const isAuth = isUserAuthenticated();

  if (!isAuth) {
    return (
      <div className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl my-auto">
          <div className={`w-20 h-20 rounded-3xl ${theme.bgAccent} ${theme.textAccent} flex items-center justify-center mb-6 shadow-xl border ${theme.borderAccent}`}>
            <HistoryIcon className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {language === 'ar' ? 'سجل المحادثات مخصص للحسابات المسجلة' : 'Chat History is for Registered Accounts'}
          </h2>
          <p className="text-sm text-white/60 max-w-md mb-8 leading-relaxed">
            {language === 'ar' 
              ? 'لحماية خصوصيتك ولضمان أمان البيانات، لا يتم حفظ أو تسجيل أي محادثات للزوار غير المسجلين. سجل دخولك للاحتفاظ بمحادثاتك والوصول إليها في أي وقت.'
              : 'To protect your privacy, no chat history is stored for guest users. Please log in to save and access your conversations anytime.'}
          </p>
          <button
            onClick={handleStartNew}
            className={`px-6 py-3 rounded-2xl ${theme.btnPrimary} font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'بدء محادثة جديدة' : 'Start New Chat'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar">
      
      {/* Header matching Settings.tsx */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors border border-white/10 active:scale-95 cursor-pointer shrink-0"
              title={language === 'ar' ? 'الرجوع للمحادثة' : 'Back to Chat'}
            >
              <ArrowRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180 text-gray-200" />
            </button>
          )}
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.previewGradient} p-0.5 shadow-lg shrink-0`}>
            <div className={`w-full h-full bg-[#141824] rounded-[10px] flex items-center justify-center`}>
              <HistoryIcon className={`w-5 h-5 ${theme.textAccent}`} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{language === 'ar' ? 'سجل المحادثات' : 'Chat History'}</h1>
            <p className="text-[11px] text-white/50">{language === 'ar' ? 'إدارة واستعراض كافة المحادثات السابقة' : 'Manage and browse your chat sessions'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            title="تحديث السجلات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin ' + theme.textAccent : ''}`} />
          </button>
          <button 
            onClick={handleStartNew}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl ${theme.btnPrimary} text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
          </button>
        </div>
      </div>

      {/* Summary / Stats Card matching Settings Profile Card */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shrink-0 relative mb-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr ${theme.previewGradient} shadow-md`}>
            <div className="w-full h-full bg-[#141824] rounded-[14px] flex items-center justify-center">
              <MessageSquare className={`w-6 h-6 ${theme.textAccent}`} />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {language === 'ar' ? 'إجمالي المحادثات' : 'Total Chats'}
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${theme.badgeClass}`}>
                {totalChats} {language === 'ar' ? 'جلسة' : 'sessions'}
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-0.5 flex items-center gap-2">
              <span>{totalPinned > 0 ? `${totalPinned} مثبتة • ` : ''}{totalMediaChats > 0 ? `${totalMediaChats} تحتوي وسائط • ` : ''}{language === 'ar' ? 'سحابي ومحلي متزامن (تنظيف قاعدة البيانات أقدم من سنة تلقائياً)' : 'Synced Cloud & Local (Database clean >365d)'}</span>
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <button 
            type="button"
            onClick={() => setShowClearAllModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs font-bold transition-all border border-red-500/30 cursor-pointer shadow-sm active:scale-95"
            title={language === 'ar' ? 'مسح كافة السجلات' : 'Clear All'}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>{language === 'ar' ? 'مسح السجل بالكامل' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-6">
        {/* Search input matching Settings inputs */}
        <div className="relative flex-1 flex items-center bg-black/30 border border-white/10 focus-within:border-white/30 rounded-2xl transition-colors shadow-inner">
          <Search className="w-4 h-4 text-white/40 ml-3.5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder:text-white/40 py-3 pl-3 pr-2 focus:outline-none text-xs sm:text-sm font-medium" 
            placeholder={language === 'ar' ? 'بحث في المحادثات السابقة...' : 'Search chat history...'} 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1.5 text-white/40 hover:text-white mr-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? `${theme.badgeClass} shadow-md` 
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'} ({totalChats})
          </button>
          <button
            onClick={() => setActiveFilter('pinned')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'pinned' 
                ? `${theme.badgeClass} shadow-md` 
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Pin className={`w-3 h-3 ${theme.textAccent}`} />
            <span>{language === 'ar' ? 'المثبتة' : 'Pinned'}</span> ({totalPinned})
          </button>
          <button
            onClick={() => setActiveFilter('media')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'media' 
                ? `${theme.badgeClass} shadow-md` 
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-indigo-400" />
            <span>{language === 'ar' ? 'الوسائط' : 'Media'}</span> ({totalMediaChats})
          </button>
          <button
            onClick={() => setActiveFilter('today')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'today' 
                ? `${theme.badgeClass} shadow-md` 
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{language === 'ar' ? 'اليوم' : 'Today'}</span>
          </button>
        </div>
      </div>

      {/* Conversations List Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/50 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-xl">
          <Sparkles className={`w-8 h-8 animate-spin ${theme.textAccent}`} />
          <span className="text-xs font-bold">{language === 'ar' ? 'جاري مزامنة وتحميل سجل المحادثات...' : 'Loading chat history...'}</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-white/50 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-xl">
          <Bot className={`w-12 h-12 mb-3 opacity-40 ${theme.textAccent} animate-pulse`} />
          <h3 className="text-base font-bold text-white mb-1">
            {searchQuery ? (language === 'ar' ? 'لا توجد نتائج تطابق بحثك' : 'No chats match your search') : (language === 'ar' ? 'لا توجد محادثات مسجلة بعد' : 'No previous chats yet')}
          </h3>
          <p className="text-xs text-white/50 max-w-xs mb-4">
            {searchQuery ? (language === 'ar' ? 'جرّب البحث بكلمة أخرى' : 'Try a different search query') : (language === 'ar' ? 'ابدأ أول محادثة ذكية مع THOTH وستُحفظ تلقائياً في حسابك' : 'Start your first chat with THOTH')}
          </p>
          <button
            onClick={handleStartNew}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl ${theme.btnPrimary} text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer`}
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'بدء محادثة جديدة الآن' : 'Start New Chat'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Group */}
          {pinnedList.length > 0 && activeFilter !== 'today' && (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-5 shadow-xl">
              <div className={`flex items-center gap-2 mb-3.5 px-1 text-xs font-bold ${theme.textAccent}`}>
                <Pin className="w-3.5 h-3.5 fill-current" />
                <span>{language === 'ar' ? 'المحادثات المثبتة' : 'Pinned Conversations'}</span>
                <span className="text-[10px] opacity-70">({pinnedList.length})</span>
              </div>
              <div className="space-y-2.5">
                {pinnedList.map(renderChatCard)}
              </div>
            </div>
          )}

          {/* Today Group */}
          {todayList.length > 0 && (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3.5 px-1 text-xs font-bold text-white/70">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'ar' ? 'محادثات اليوم' : 'Today'}</span>
                <span className="text-[10px] text-white/40">({todayList.length})</span>
              </div>
              <div className="space-y-2.5">
                {todayList.map(renderChatCard)}
              </div>
            </div>
          )}

          {/* Yesterday Group */}
          {yesterdayList.length > 0 && activeFilter !== 'today' && (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3.5 px-1 text-xs font-bold text-white/70">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'ar' ? 'أمس' : 'Yesterday'}</span>
                <span className="text-[10px] text-white/40">({yesterdayList.length})</span>
              </div>
              <div className="space-y-2.5">
                {yesterdayList.map(renderChatCard)}
              </div>
            </div>
          )}

          {/* Older Group */}
          {olderList.length > 0 && activeFilter !== 'today' && (
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3.5 px-1 text-xs font-bold text-white/70">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <span>{language === 'ar' ? 'المحادثات السابقة' : 'Older'}</span>
                <span className="text-[10px] text-white/40">({olderList.length})</span>
              </div>
              <div className="space-y-2.5">
                {olderList.map(renderChatCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowClearAllModal(false)}>
          <div className="bg-[#181c2b] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shadow-lg">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {language === 'ar' ? 'مسح سجل المحادثات بالكامل؟' : 'Clear All Chat History?'}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {language === 'ar' ? 'سيتم حذف جميع المحادثات المسجلة نهائياً من حسابك والجهاز. لا يمكن التراجع عن هذا الإجراء.' : 'All saved chat sessions will be permanently deleted. This action cannot be undone.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full mt-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                {language === 'ar' ? 'نعم، إحذف الكل' : 'Yes, Delete All'}
              </button>
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
