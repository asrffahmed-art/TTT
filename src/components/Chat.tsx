import { Discover } from './Discover';
import { Mic, Send, ListTodo, Loader2, Volume2, Copy, Check, Trash2, Plus, MicOff, Clock, ThumbsUp, ThumbsDown, RotateCcw, Bot, Sparkles, CheckCheck, Bookmark, Zap, Brain, Globe, Radio, X, VolumeX, Edit3, BookOpen, HardDrive, AlertTriangle, ImageIcon, FileText, Download, Paperclip, Code, Share2, Video, Film, FileVideo, History as HistoryIcon, PanelLeftOpen, PanelLeftClose, Menu, Pin, Edit2, Search, MessageSquare, Maximize2, GraduationCap } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, cleanObject, uploadMediaToCloudStorage } from '../lib/firebase';
import { LiveAudioService, LiveAudioState } from '../services/liveAudioService';
import { checkUsageLimit, incrementUsage, saveChatMessageWithStorageCheck, deleteChatOrMessage } from '../lib/subscriptionService';
import { 
  getActiveSessionId, 
  setActiveSessionId, 
  loadAllSessions, 
  loadSessionMessages, 
  getLocalSessionMessagesSync,
  saveLocalSessionMessages, 
  createNewSession, 
  touchSession, 
  renameSession, 
  togglePinSession, 
  deleteSession, 
  getEffectiveUserId,
  getCachedSessions,
  buildCrossSessionMemory,
  ChatSession 
} from '../lib/chatSessionManager';
import { extractStudyToolCommands, applyStudyToolCommands, sanitizeStudyTags } from '../lib/studyToolsService';
import { compressImage, prepareVideoForUpload, formatBytes, isCompressibleImage, isCompressibleVideo } from '../lib/mediaCompression';
import { Subscription } from './Subscription';
import { SearchResultView } from './SearchResultView';
import { ArtifactViewer } from './ArtifactViewer';
import { AdPlacement } from './AdPlacement';
import { AudioSummaryPlayer } from './AudioSummaryPlayer';
import { WebSource, WebImage, Message } from '../types';
import { useAppTheme } from '../lib/themeService';
import { dataProgramService } from '../lib/dataProgramService';

interface ChatProps {
  initialMessage?: string | { text: string; image?: string; audio?: string; items?: any[]; noteId?: string };
  clearInitialMessage?: () => void;
  activeChatId?: string | null;
  onSelectChatId?: (id: string | null) => void;
  onToggleLiveModal?: (isOpen: boolean) => void;
  onToggleArtifactModal?: (isOpen: boolean) => void;
  onNavigate?: (tab: string) => void;
  isAuthenticated?: boolean;
}

export function Chat({ initialMessage, clearInitialMessage, activeChatId, onSelectChatId, onToggleLiveModal, onToggleArtifactModal, onNavigate, isAuthenticated }: ChatProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const theme = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeNoteId, setActiveNoteIdState] = useState<string | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);
  const setActiveNoteId = (val: string | null) => {
    setActiveNoteIdState(val);
    activeNoteIdRef.current = val;
  };

  const getActiveNoteTitle = () => {
    if (!activeNoteId) return null;
    try {
      const userId = getEffectiveUserId();
      if (!userId) return isAr ? 'ملاحظة نشطة' : 'Active Note';
      const saved = localStorage.getItem(`app-keep-notes-${userId}`);
      if (saved) {
        const notes = JSON.parse(saved);
        const note = notes.find((n: any) => n.id === activeNoteId);
        return note ? note.title : (isAr ? 'ملاحظة نشطة' : 'Active Note');
      }
    } catch (e) {
      console.error(e);
    }
    return isAr ? 'ملاحظة نشطة' : 'Active Note';
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleQuickShare = async () => {
    if (messages.length === 0) return;
    
    const textSnippet = messages.map(m => {
      const role = m.isUser ? (isAr ? '👤 أنت' : '👤 You') : '🤖 THOTH';
      return `${role}:\n${m.text}`;
    }).join('\n\n');

    const title = isAr ? "💬 محادثة مع THOTH" : "💬 Chat with THOTH";
    const content = `${title}\n${"=".repeat(20)}\n\n${textSnippet}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: content,
        });
      } else {
        await navigator.clipboard.writeText(content);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to share chat snippet:', err);
        try {
          await navigator.clipboard.writeText(content);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } catch (copyErr) {
          console.error('Failed to copy chat snippet as fallback:', copyErr);
        }
      }
    }
  };

  const [isAuth, setIsAuth] = useState(() => {
    if (typeof isAuthenticated === 'boolean') return isAuthenticated;
    return Boolean(auth.currentUser || localStorage.getItem('isAuth') === 'true');
  });

  useEffect(() => {
    const handleAuthChange = () => {
      const authed = typeof isAuthenticated === 'boolean'
        ? isAuthenticated
        : Boolean(auth.currentUser || localStorage.getItem('isAuth') === 'true');
      setIsAuth(authed);
    };
    handleAuthChange();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuth(Boolean(user || localStorage.getItem('isAuth') === 'true'));
    });

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('thoth_auth_changed', handleAuthChange);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('thoth_auth_changed', handleAuthChange);
    };
  }, [isAuthenticated]);
  const [selectedMode, setSelectedMode] = useState<'fast' | 'thinking' | 'web_search' | 'image' | 'audio_summary' | 'learn'>('fast');
  const [showPlusMenu, setShowPlusMenu] = useState<boolean>(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showPlusMenu]);

  const [searchProgressStep, setSearchProgressStep] = useState<number>(0);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 24), 180)}px`;
    }
  }, [input]);
  
  interface AttachedFile {
    name: string;
    url: string;
    downloadUrl?: string;
    type: string;
    fileUri?: string;
    fileRefName?: string;
    isUploadedToFileApi?: boolean;
    sizeFormatted?: string;
    originalSizeBytes?: number;
    compressedSizeBytes?: number;
    savingsPercentage?: number;
    thumbnailUrl?: string;
    isVideo?: boolean;
    isImage?: boolean;
  }
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert(isAr ? "حجم الملف كبير جداً! يرجى اختيار ملف أصغر من 25 ميجابايت." : "File size is too large! Please choose a file smaller than 25MB.");
      return;
    }

    setIsUploadingFile(true);
    setUploadStatusText(isAr ? 'جاري تحضير وضغط الوسائط...' : 'Preparing and compressing media...');

    try {
      const isImg = isCompressibleImage(file);
      const isVid = isCompressibleVideo(file);

      let processedFile: File = file;
      let previewUrl = '';
      let thumbUrl = '';
      let originalSize = file.size;
      let compressedSize = file.size;
      let savingsPercentage = 0;

      // Client-Side Image Compression
      if (isImg) {
        setUploadStatusText(isAr ? 'جاري ضغط الصورة محلياً لتوفير المساحة...' : 'Compressing image locally to save space...');
        try {
          const compResult = await compressImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.82,
            mimeType: file.type === 'image/png' ? 'image/jpeg' : 'image/jpeg'
          });
          processedFile = compResult.file;
          previewUrl = compResult.dataUrl || '';
          originalSize = compResult.originalSize;
          compressedSize = compResult.compressedSize;
          savingsPercentage = compResult.savingsPercentage;
        } catch (compErr) {
          console.warn('Image compression fallback:', compErr);
        }
      } else if (isVid) {
        setUploadStatusText(isAr ? 'جاري تجهيز الفيديو وتوليد المعاينة...' : 'Preparing video and generating preview...');
        try {
          const vidResult = await prepareVideoForUpload(file);
          thumbUrl = vidResult.thumbnailUrl;
          originalSize = vidResult.originalSize;
          compressedSize = vidResult.compressedSize;
        } catch (vidErr) {
          console.warn('Video preparation fallback:', vidErr);
        }
      }

      // Read file for upload
      setUploadStatusText(isAr ? 'جاري رفع الوسائط إلى التخزين السحابي (Cloud Storage)...' : 'Uploading media to Cloud Storage...');
      
      const reader = new FileReader();
      const base64Data: string = await new Promise((res, rej) => {
        reader.onloadend = () => res(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = rej;
        reader.readAsDataURL(processedFile);
      });

      if (!previewUrl) {
        previewUrl = base64Data;
      }

      const currentUid = auth.currentUser?.uid || 'guest';
      const storagePath = `users/${currentUid}/media/${Date.now()}_${processedFile.name}`;

      // Upload to Cloud Storage / Media Store
      let cloudDownloadUrl = '';
      try {
        const storageResult = await uploadMediaToCloudStorage(processedFile, storagePath, processedFile.type);
        cloudDownloadUrl = storageResult.downloadUrl;
      } catch (storageErr) {
        console.warn('Cloud storage upload error:', storageErr);
      }

      // Also register with Google Files API for multimodal chat intelligence
      let fileUri: string | undefined = undefined;
      let fileRefName: string | undefined = undefined;
      let isUploadedToFileApi = false;

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: processedFile.name,
            mimeType: processedFile.type || 'application/octet-stream',
            userId: auth.currentUser?.uid
          })
        });

        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};

        if (res.ok && data.success) {
          fileUri = data.fileUri;
          fileRefName = data.fileRefName;
          isUploadedToFileApi = data.isUploadedToFileApi;
        }
      } catch (apiErr) {
        console.warn('Files API optional registration error:', apiErr);
      }

      setAttachedFile({
        name: processedFile.name,
        url: previewUrl,
        downloadUrl: cloudDownloadUrl || previewUrl,
        type: processedFile.type || 'application/octet-stream',
        fileUri,
        fileRefName,
        isUploadedToFileApi,
        sizeFormatted: formatBytes(compressedSize),
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize,
        savingsPercentage,
        thumbnailUrl: thumbUrl,
        isVideo: isVid,
        isImage: isImg
      });
    } catch (err: any) {
      console.error('File selection error:', err);
      alert(isAr ? 'حدث خطأ أثناء معالجة أو رفع الملف.' : 'An error occurred while processing or uploading the file.');
    } finally {
      setIsUploadingFile(false);
      setUploadStatusText('');
    }
  };

  const handleRemoveAttachment = async () => {
    if (attachedFile?.fileRefName) {
      fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: attachedFile.fileRefName })
      }).catch(err => console.warn("Failed to delete file from Files API:", err));
    }
    setAttachedFile(null);
  };

  useEffect(() => {
    let interval: any;
    if (isLoading && selectedMode === 'web_search') {
      setSearchProgressStep(0);
      interval = setInterval(() => {
        setSearchProgressStep(prev => (prev < 3 ? prev + 1 : 3));
      }, 900);
    } else {
      setSearchProgressStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, selectedMode]);

  const searchSteps = [
    { icon: Globe, label: isAr ? '🔎 البحث في الويب...' : '🔎 Searching the web...' },
    { icon: BookOpen, label: isAr ? '📚 قراءة وتحليل المصادر...' : '📚 Reading sources...' },
    { icon: Brain, label: isAr ? '🧠 معالجة المعلومات...' : '🧠 Analyzing information...' },
    { icon: Edit3, label: isAr ? '✍️ صياغة الإجابة النهائية...' : '✍️ Writing answer...' }
  ];
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [savedToKeepId, setSavedToKeepId] = useState<string | number | null>(null);
  const [savedToTasksId, setSavedToTasksId] = useState<string | number | null>(null);

  const handleSaveToTasks = async (msgId: string | number, text: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert(isAr ? 'يجب تسجيل الدخول لحفظ المهام' : 'You must sign in to save tasks');
      return;
    }
    
    // Quick summary of text as title (first 40 chars)
    const title = text.length > 40 ? text.substring(0, 40) + '...' : text;
    
    const newTask = {
      id: `task_${Date.now()}`,
      title,
      notes: text,
      status: 'needsAction',
      due: new Date().toISOString(),
      completed: null,
      listId: 'default',
      position: Date.now().toString(),
      updated: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, `users/${user.uid}/tasks`, newTask.id), cleanObject(newTask));
      setSavedToTasksId(msgId);
      setTimeout(() => setSavedToTasksId(null), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/tasks/${newTask.id}`);
    }
  };

  const handleSaveToKeep = async (msgId: string | number, text: string) => {
    const userId = getEffectiveUserId();

    // Extract image if present in message text
    let imageUrl: string | undefined = undefined;
    const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
    if (mdMatch) {
      imageUrl = mdMatch[1];
    } else {
      const pollMatch = text.match(/(https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+)/i);
      if (pollMatch) {
        imageUrl = pollMatch[1];
      } else {
        const directMatch = text.match(/(https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif))/i);
        if (directMatch) imageUrl = directMatch[1];
      }
    }

    const cleanText = text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+/gi, '')
      .replace(/https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif)/gi, '')
      .replace(/\*\(Prompt:.*?\)\*/gi, '')
      .replace(/\[Prompt:.*?\]/gi, '')
      .trim();

    const timeString = isAr 
      ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newNote = {
      id: `note_${Date.now()}`,
      title: isAr ? `ملاحظة من المحادثة (${timeString})` : `Note from chat (${timeString})`,
      content: cleanText || (imageUrl ? (isAr ? 'صورة محفوظة من المحادثة' : 'Saved image from chat') : text),
      imageUrl: imageUrl,
      color: 'bg-purple-900/40 border-purple-500/30',
      isPinned: false,
      tags: isAr ? ['محادثة AI', 'الملاحظات'] : ['AI Chat', 'Notes'],
      updatedAt: isAr ? new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    if (userId) {
      const localStorageKey = `app-keep-notes-${userId}`;
      const saved = localStorage.getItem(localStorageKey);
      let notes = [];
      if (saved) {
        try { notes = JSON.parse(saved); } catch (e) { notes = []; }
      }
      notes.unshift(newNote);
      localStorage.setItem(localStorageKey, JSON.stringify(notes));

      try {
        await setDoc(doc(db, 'users', userId, 'notes', newNote.id), cleanObject(newNote));
      } catch (err) {
        console.error(err);
      }
    }

    setSavedToKeepId(msgId);
    setTimeout(() => setSavedToKeepId(null), 2500);
  };
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveAudioOpen, setIsLiveAudioOpen] = useState(false);
  const [liveState, setLiveState] = useState<LiveAudioState>('disconnected');
  const [liveVolume, setLiveVolume] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveAudioOpen) {
      interval = setInterval(async () => {
        try {
          const user = auth.currentUser;
          const res = await fetch('/api/sync-voice-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user ? user.uid : null, seconds: 10 })
          }).catch((err) => {
            console.warn("Voice usage sync warning:", err);
            return null;
          });
          if (!res) return;
          const contentType = res.headers.get("content-type") || "";
          const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
          if (data) {
            if (data.used !== undefined) {
              localStorage.setItem('thoth_usage_voice_sec', String(data.used));
              window.dispatchEvent(new Event('thoth_usage_updated'));
            }
            if (!data.allowed) {
              handleCloseLiveModal();
              if (onNavigate) onNavigate('subscription');
            }
          }
        } catch(err) {
          console.error(err);
        }
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveAudioOpen, onNavigate]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveTranscripts, setLiveTranscripts] = useState<{ text: string; isUser: boolean }[]>([]);

  const liveServiceRef = useRef<LiveAudioService | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Clean up live audio on unmount
  useEffect(() => {
    return () => {
      if (liveServiceRef.current) {
        liveServiceRef.current.disconnect();
      }
    };
  }, []);

  const initLiveAudioService = () => {
    if (!liveServiceRef.current) {
      liveServiceRef.current = new LiveAudioService({
        onStateChange: (newState, errorMsg) => {
          setLiveState(newState);
          if (errorMsg) {
            setLiveError(errorMsg);
          } else {
            setLiveError(null);
          }
        },
        onTranscript: (text, isUser) => {
          if (!text) return;
          setLiveTranscripts(prev => {
            const last = prev[prev.length - 1];
            if (last && last.isUser === isUser) {
              return prev.map((item, idx) => 
                idx === prev.length - 1 ? { ...item, text: item.text + ' ' + text } : item
              );
            }
            return [...prev, { text, isUser }];
          });
        },
        onVolumeChange: (vol) => {
          setLiveVolume(vol);
        }
      });
    }
    return liveServiceRef.current;
  };

  const startLiveAudio = async () => {
    const service = initLiveAudioService();
    await service.connect();
  };

  const stopLiveAudio = () => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
    }
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch (e) {}
      activeAudioRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
      mediaRecorderRef.current = null;
    }

    setLiveState('disconnected');
    setLiveVolume(0);
  };

  const handleOpenLiveModal = () => {
    setIsLiveAudioOpen(true);
    onToggleLiveModal?.(true);
  };

  const handleCloseLiveModal = () => {
    setIsLiveAudioOpen(false);
    onToggleLiveModal?.(false);
  };
  const [feedback, setFeedback] = useState<Record<string | number, 'like' | 'dislike'>>({});
  const [preferenceCandidate, setPreferenceCandidate] = useState<{
    prompt: string;
    responseA: string;
    responseB: string;
    submitted?: boolean;
  } | null>(null);
  const [editingMsgData, setEditingMsgData] = useState<{ 
    msgId: string | number; 
    prompt: string; 
    originalResponse: string; 
    currentText: string;
    userNote?: string;
    selectedCategory?: string;
    updateLocalMsg?: boolean;
    isSending?: boolean;
    isSentSuccess?: boolean;
  } | null>(null);
  const [selectedPrefReason, setSelectedPrefReason] = useState<string>('أكثر دقة واكتمالاً');
  const [openArtifactKey, setOpenArtifactKey] = useState<string | null>(null);

  useEffect(() => {
    onToggleArtifactModal?.(!!openArtifactKey || !!previewImageModalUrl || !!preferenceCandidate || !!editingMsgData);
  }, [openArtifactKey, previewImageModalUrl, preferenceCandidate, editingMsgData, onToggleArtifactModal]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isSessionJustLoadedRef = useRef<boolean>(false);
  const shouldSmoothScrollRef = useRef<boolean>(false);
  const prevSessionIdRef = useRef<string | null>(null);
  const userHasScrolledUpRef = useRef<boolean>(false);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (!target) return;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    userHasScrolledUpRef.current = distanceFromBottom > 50;
  };

  const scrollToBottom = (instant = false, force = false) => {
    if (!force && userHasScrolledUpRef.current) return;
    if (!messagesContainerRef.current) return;
    if (instant) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    } else {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };
  
  const audioChunksRef = useRef<Blob[]>([]);

  const sessionIdRef = useRef<string>(getActiveSessionId());
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionIdRef.current);
  const [currentChatTitle, setCurrentChatTitle] = useState<string>(isAr ? 'محادثة جديدة' : 'New Chat');
  const [sessionsList, setSessionsList] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarOpenTimeRef = useRef<number>(0);

  const handleOpenSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sidebarOpenTimeRef.current = Date.now();
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSidebarOpen(false);
  };
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [storageErrorBanner, setStorageErrorBanner] = useState<{ message: string; storageUsed?: number; storageLimit?: number } | null>(null);

  // Audio summaries can legitimately take 1-3 minutes under Google-side load
  // (model 503 retries) — surface a patience hint so users don't think it froze
  const [slowAudioHint, setSlowAudioHint] = useState(false);
  useEffect(() => {
    if (isLoading && selectedMode === 'audio_summary') {
      const t = setTimeout(() => setSlowAudioHint(true), 15000);
      return () => clearTimeout(t);
    }
    setSlowAudioHint(false);
  }, [isLoading, selectedMode]);
  
  const isSwitchingSessionRef = useRef<boolean>(false);
  const targetSessionIdRef = useRef<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);

  // Load Sessions List from Local + Firestore
  const loadSessions = async () => {
    try {
      const list = await loadAllSessions();
      setSessionsList(list);
      const active = list.find(s => s.id === sessionIdRef.current);
      if (active) {
        setCurrentChatTitle(active.title || (isAr ? 'محادثة سابقة' : 'Previous Chat'));
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  useEffect(() => {
    loadSessions();

    const handleSessionsListUpdated = (e: any) => {
      if (Array.isArray(e.detail?.sessions)) {
        const updatedList = e.detail.sessions;
        setSessionsList(updatedList);
        // Guests have no session list by design. An EMPTY guest list broadcast
        // (fired on every page load via handleUserLogoutCleanup) must NOT reset
        // the active conversation — doing so minted a fresh session id on each
        // load and erased the guest's conversation memory entirely.
        if (!getEffectiveUserId() && updatedList.length === 0) {
          return;
        }
        const stillExists = updatedList.some((s: ChatSession) => s.id === sessionIdRef.current);
        if (!stillExists && sessionIdRef.current) {
          if (updatedList.length > 0) {
            switchSession(updatedList[0].id, true);
          } else {
            handleNewChat();
          }
        } else {
          const active = updatedList.find((s: ChatSession) => s.id === sessionIdRef.current);
          if (active) {
            setCurrentChatTitle(active.title || (isAr ? 'محادثة سابقة' : 'Previous Chat'));
          }
        }
      }
    };

    const handleActiveSessionChanged = (e: any) => {
      const sid = e.detail?.sessionId;
      if (!sid) return;
      // Echo guard: switchSession itself re-dispatches this event after updating
      // the active id. Re-entering on our own echo caused an infinite
      // switchSession loop ("Maximum call stack size exceeded") which aborted
      // whatever was running — including the live-voice mic pipeline.
      if (sid === sessionIdRef.current) return;
      switchSession(sid, true);
    };

    const handleOpenDrawerEvent = () => {
      sidebarOpenTimeRef.current = Date.now();
      setIsSidebarOpen(true);
    };

    window.addEventListener('thoth_sessions_list_updated', handleSessionsListUpdated);
    window.addEventListener('thoth_active_session_changed', handleActiveSessionChanged);
    window.addEventListener('thoth_open_chat_drawer', handleOpenDrawerEvent);

    return () => {
      window.removeEventListener('thoth_sessions_list_updated', handleSessionsListUpdated);
      window.removeEventListener('thoth_active_session_changed', handleActiveSessionChanged);
      window.removeEventListener('thoth_open_chat_drawer', handleOpenDrawerEvent);
    };
  }, []);

  const saveMessageToFirestore = async (msg: Message) => {
    const userId = getEffectiveUserId();
    if (!userId) return;

    const sId = sessionIdRef.current;
    const defaultNewChat = isAr ? 'محادثة جديدة' : 'New Chat';
    const fallbackTitle = isAr ? 'محادثة ذكاء اصطناعي' : 'AI Chat';
    const chatTitle = currentChatTitle !== defaultNewChat ? currentChatTitle : (msg.isUser ? msg.text.substring(0, 35) : fallbackTitle);

    const determinedType = msg.messageType || (
      msg.videoUrl ? 'video' :
      msg.imageUrl ? 'image' :
      msg.audioUrl ? 'audio' :
      msg.fileUrl ? 'file' : 'text'
    );

    try {
      const res = await saveChatMessageWithStorageCheck(userId, sId, chatTitle, {
        id: String(msg.id),
        senderId: msg.senderId || (msg.isUser ? userId : 'model'),
        chatId: sId,
        userId: userId,
        role: msg.isUser ? 'user' : 'model',
        isUser: msg.isUser,
        content: msg.text,
        text: msg.text,
        timestamp: msg.timestamp || new Date().toISOString(),
        messageType: determinedType,
        mediaUrl: msg.mediaUrl || msg.videoUrl || msg.imageUrl || msg.audioUrl || msg.fileUrl,
        imageUrl: msg.imageUrl,
        videoUrl: msg.videoUrl,
        audioUrl: msg.audioUrl,
        thumbnailUrl: msg.thumbnailUrl,
        fileUrl: msg.fileUrl,
        mediaType: msg.fileType,
        fileType: msg.fileType,
        mediaSize: msg.mediaSize || (msg.compressionInfo ? msg.compressionInfo.compressedSize : undefined),
        mediaName: msg.fileName,
        fileName: msg.fileName,
        images: msg.images || (msg.imageUrl ? [{ url: msg.imageUrl, description: msg.fileName || (isAr ? 'صورة' : 'Image') }] : []),
        sources: msg.sources || [],
        relatedSources: msg.relatedSources || [],
        modelUsed: msg.modelUsed
      });

      if (!res.success && res.code === 'STORAGE_FULL') {
        setStorageErrorBanner({
          message: res.error || (isAr ? 'وصلت إلى الحد الأقصى لمساحة تخزين المحادثات لخطة حسابك.' : 'You have reached the maximum chat storage capacity for your plan.'),
          storageUsed: res.storageUsed,
          storageLimit: res.storageLimit
        });
      } else if (res.success) {
        setStorageErrorBanner(null);
      }
    } catch (err) {
      console.error('Save message error:', err);
    }
  };

  // Switch to an existing chat session
  const switchSession = async (sessionId: string, force = false) => {
    if (!sessionId) return;
    setIsSidebarOpen(false);
    if (sessionId.startsWith('new_')) {
      handleNewChat();
      return;
    }
    if (!force && sessionId === sessionIdRef.current && messages.length > 0 && !isLoadingSession) {
      return;
    }

    isSwitchingSessionRef.current = true;
    targetSessionIdRef.current = sessionId;
    sessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
    onSelectChatId?.(sessionId);

    userHasScrolledUpRef.current = false;

    // Update title immediately from sessionsList or cached sessions fallback
    const cachedSessionsList = getCachedSessions();
    const sessionItem = sessionsList.find(s => s.id === sessionId) || cachedSessionsList.find(s => s.id === sessionId);
    if (sessionItem?.title) {
      setCurrentChatTitle(sessionItem.title);
    } else {
      setCurrentChatTitle(isAr ? 'محادثة سابقة' : 'Previous Chat');
    }

    // Always update current active session ID state immediately
    setCurrentSessionId(sessionId);

    // 1. Synchronously load local cached messages for instant 0ms display
    const localMsgs = getLocalSessionMessagesSync(sessionId);
    if (localMsgs && localMsgs.length > 0) {
      setMessages(localMsgs as Message[]);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      // Synchronously clear previous messages so old chat messages don't leak while server fetch is in progress
      setMessages([]);
    }

    // 2. Fetch server updates quietly in background
    try {
      setIsLoadingSession(true);
      const msgs = await loadSessionMessages(sessionId);
      if (targetSessionIdRef.current === sessionId) {
        if (msgs && msgs.length > 0) {
          setMessages(msgs as Message[]);
          // Only force scroll down if the user HAS NOT scrolled up while waiting for server response!
          if (!userHasScrolledUpRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        } else if (!localMsgs || localMsgs.length === 0) {
          setMessages([
            { id: Date.now(), text: isAr ? 'مرحباً! أنا نموذج THOTH للذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن البرمجة، كتابة الأكواد، صياغة المقالات أو توليد الصور والفيديو!' : 'Hello! I am THOTH AI. How can I help you today? You can ask me about programming, coding, writing essays, or generating images and video!', isUser: false, time: isAr ? 'الآن' : 'Now' }
          ]);
        }
      }
    } catch (e) {
      console.error('Error loading session messages:', e);
      if (targetSessionIdRef.current === sessionId && (!localMsgs || localMsgs.length === 0)) {
        setMessages([
          { id: Date.now(), text: isAr ? 'تعذر تحميل الرسائل السابقة لهذه المحادثة.' : 'Could not load previous messages for this conversation.', isUser: false, time: isAr ? 'الآن' : 'Now' }
        ]);
      }
    } finally {
      if (targetSessionIdRef.current === sessionId) {
        setIsLoadingSession(false);
        isSwitchingSessionRef.current = false;
      }
    }
  };

  // Handle activeChatId prop from external navigation
  useEffect(() => {
    if (activeChatId) {
      setIsSidebarOpen(false);
      if (activeChatId.startsWith('new_')) {
        handleNewChat();
      } else {
        switchSession(activeChatId, true);
      }
    } else if (messages.length === 0 && sessionIdRef.current) {
      switchSession(sessionIdRef.current, true);
    }
  }, [activeChatId]);

  // Handle Start New Chat
  const handleNewChat = () => {
    const newSession = createNewSession(isAr ? 'محادثة جديدة' : 'New Chat');
    sessionIdRef.current = newSession.id;
    setCurrentSessionId(newSession.id);
    setCurrentChatTitle(newSession.title);
    onSelectChatId?.(newSession.id);

    const defaultMsgs: Message[] = [
      { 
        id: Date.now(), 
        text: isAr ? 'مرحباً! أنا نموذج THOTH للذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن البرمجة، كتابة الأكواد، صياغة المقالات أو توليد الصور والفيديو!' : 'Hello! I am THOTH AI. How can I help you today? You can ask me about programming, coding, writing essays, or generating images and video!', 
        isUser: false, 
        time: isAr ? 'الآن' : 'Now' 
      }
    ];

    setMessages(defaultMsgs);
    saveLocalSessionMessages(newSession.id, defaultMsgs);
    setIsSidebarOpen(false);
  };

  // Handle Rename Session
  const handleSaveRenameSession = async (sessionId: string, newTitle: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!newTitle.trim()) return;

    const trimmed = newTitle.trim();
    await renameSession(sessionId, trimmed);
    if (sessionId === currentSessionId) {
      setCurrentChatTitle(trimmed);
    }
    setEditingSessionId(null);
  };

  // Handle Toggle Pin
  const handleTogglePinSession = async (sessionId: string, currentPin: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinSession(sessionId, currentPin);
  };

  // Handle Delete Session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(isAr ? 'هل تريد حذف هذه المحادثة بالكامل؟' : 'Delete this conversation completely?')) return;
    
    // Optimistic UI update in drawer
    setSessionsList(prev => prev.filter(s => s.id !== sessionId));

    if (sessionId === currentSessionId) {
      handleNewChat();
    }

    await deleteSession(sessionId);
  };

  // Initial mount: load active session messages
  useEffect(() => {
    const active = getActiveSessionId();
    switchSession(active);
  }, []);

  // [BROADCAST-CLICK] Surface an admin broadcast message INSIDE the chat as a
  // THOTH message so the user can read it and ask follow-up questions about it.
  // The `thoth_inject_broadcast` event is dispatched by App.tsx from two paths:
  //   1. the in-app notification toast CTA (push arrived while app visible),
  //   2. the service-worker bridge (user tapped the OS notification while the
  //      app was closed/backgrounded — THOTH_OPEN_BROADCAST postMessage).
  // The message is injected as a model message into the CURRENT session only
  // (display + local cache via the messages effect). For registered users it
  // is also persisted through the same saveMessageToFirestore path as normal
  // chat messages; guests keep their zero-storage rule (early-return inside).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const bTitle = (detail.title || '').toString().trim();
      const bBody = (detail.body || '').toString().trim();
      if (!bTitle && !bBody) return;

      const timeString = isAr
        ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const broadcastText = isAr
        ? `📣 **رسالة من فريق THOTH**\n\n**${bTitle}**\n\n${bBody}\n\nلو عندك أي سؤال عن الرسالة دي أو عايز تفاصيل أكتر، اكتب سؤالك هنا وهجاوبك فورًا. 💬`
        : `📣 **A message from the THOTH team**\n\n**${bTitle}**\n\n${bBody}\n\nIf you have any question about this message or want more details, just type it here and I'll answer right away. 💬`;

      const injected: Message = {
        id: Date.now(),
        senderId: 'model',
        chatId: sessionIdRef.current,
        userId: getEffectiveUserId() || 'model',
        text: broadcastText,
        isUser: false,
        time: timeString,
        timestamp: new Date().toISOString(),
        messageType: 'text'
      };

      setMessages(prev => [...prev, injected]);
      saveMessageToFirestore(injected);
    };

    window.addEventListener('thoth_inject_broadcast', handler);
    return () => window.removeEventListener('thoth_inject_broadcast', handler);
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;

    if (!isSwitchingSessionRef.current && currentSessionId === sessionIdRef.current) {
      saveLocalSessionMessages(currentSessionId, messages);
    }

    const sessionChanged = prevSessionIdRef.current !== currentSessionId;
    prevSessionIdRef.current = currentSessionId;

    if (sessionChanged || isSwitchingSessionRef.current || isSessionJustLoadedRef.current) {
      isSessionJustLoadedRef.current = false;
      shouldSmoothScrollRef.current = false;
      if (!userHasScrolledUpRef.current) {
        scrollToBottom(true);
      }
    } else if (shouldSmoothScrollRef.current) {
      shouldSmoothScrollRef.current = false;
      scrollToBottom(false, true);
    }
  }, [messages, currentSessionId]);

  const saveChatToHistory = (userText: string, aiText: string, mediaInfo?: { mediaUrl?: string; mediaType?: string; isVideo?: boolean; thumbnailUrl?: string }) => {
    touchSession(sessionIdRef.current, userText, aiText, mediaInfo);
  };

  const handleSend = async (textToSend?: string | { text: string; image?: string; audio?: string; file?: string; fileName?: string; fileType?: string; noteId?: string }) => {
    let text = "";
    let imagePayload = null;
    let audioPayload = null;
    let filePayload = null;
    let videoPayload = null;
    let mediaUrlPayload = null;
    let namePayload = "";
    let typePayload = "";
    let fileUriPayload: string | undefined = undefined;
    let fileRefNamePayload: string | undefined = undefined;
    let isUploadedToFileApiPayload: boolean = false;
    let compressionInfoPayload = undefined;
    let thumbnailUrlPayload = undefined;

    // Set from state if available
    if (attachedFile) {
      if (attachedFile.isVideo) {
        videoPayload = attachedFile.downloadUrl || attachedFile.url;
        mediaUrlPayload = attachedFile.downloadUrl || attachedFile.url;
      } else if (attachedFile.type.startsWith('image/')) {
        imagePayload = attachedFile.downloadUrl || attachedFile.url;
        mediaUrlPayload = attachedFile.downloadUrl || attachedFile.url;
      } else if (attachedFile.type.startsWith('audio/')) {
        audioPayload = attachedFile.downloadUrl || attachedFile.url;
        mediaUrlPayload = attachedFile.downloadUrl || attachedFile.url;
      } else {
        filePayload = attachedFile.downloadUrl || attachedFile.url;
        mediaUrlPayload = attachedFile.downloadUrl || attachedFile.url;
      }
      namePayload = attachedFile.name;
      typePayload = attachedFile.type;
      fileUriPayload = attachedFile.fileUri;
      fileRefNamePayload = attachedFile.fileRefName;
      isUploadedToFileApiPayload = attachedFile.isUploadedToFileApi || false;
      thumbnailUrlPayload = attachedFile.thumbnailUrl;
      
      if (attachedFile.savingsPercentage && attachedFile.savingsPercentage > 0) {
        compressionInfoPayload = {
          originalSize: attachedFile.originalSizeBytes || 0,
          compressedSize: attachedFile.compressedSizeBytes || 0,
          savingsPercentage: attachedFile.savingsPercentage
        };
      }
    }

    if (textToSend && typeof textToSend === 'object') {
      text = textToSend.text;
      if (textToSend.image) imagePayload = textToSend.image;
      if (textToSend.audio) audioPayload = textToSend.audio;
      if (textToSend.file) filePayload = textToSend.file;
      if (textToSend.fileName) namePayload = textToSend.fileName;
      if (textToSend.fileType) typePayload = textToSend.fileType;
      if (textToSend.noteId) {
        setActiveNoteId(textToSend.noteId);
      }
    } else {
      text = typeof textToSend === 'string' ? textToSend : input;
    }

    if (!text.trim()) {
      if (filePayload || attachedFile || fileUriPayload || imagePayload || videoPayload) {
        text = isAr 
          ? `يرجى مراجعة وتلخيص هذا المستند/الوسائط المرفقة (${namePayload || (attachedFile ? attachedFile.name : '') || 'الملف'}) بالتفصيل واستخراج النقاط والمعلومات الرئيسية بوضوح وتنسيق جذاب.`
          : `Please review and summarize this attached document/media (${namePayload || (attachedFile ? attachedFile.name : '') || 'file'}) in detail and extract the key points and information clearly with engaging formatting.`;
      } else {
        return;
      }
    }

    if (isLoading) return;
    
    const currentUser = auth.currentUser;
    const userId = currentUser ? currentUser.uid : null;

    const messageTypeDetermined: 'text' | 'image' | 'video' | 'audio' | 'file' = 
      videoPayload ? 'video' :
      imagePayload ? 'image' :
      audioPayload ? 'audio' :
      (filePayload || fileUriPayload) ? 'file' : 'text';

    const timeString = isAr 
      ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // OWNER RULE: the Audio Summary & Podcast studio is for REGISTERED users
    // only — guests must never reach it. Belt-and-braces guard: the composer
    // entries are already hidden for guests; this covers the rare case where
    // the mode was selected while signed in and the user then signed out
    // without a page reload.
    if (selectedMode === 'audio_summary' && !isAuth) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: isAr
            ? '🎙️ ميزة الملخص الصوتي والبودكاست (THOTH Audio) متاحة لأصحاب الحسابات المسجّلة فقط. أنشئ حساباً مجانياً أو سجّل دخولك لتفعيل الاستوديو الصوتي.'
            : '🎙️ The Audio Summary & Podcast studio (THOTH Audio) is available to registered accounts only. Create a free account or sign in to unlock it.',
          isUser: false,
          time: timeString,
          isLimitError: true
        }
      ]);
      setSelectedMode('fast');
      return;
    }

    const newMsg: Message = { 
      id: Date.now(), 
      senderId: userId || 'guest',
      chatId: sessionIdRef.current,
      userId: userId || 'guest',
      text: text, 
      isUser: true, 
      time: timeString,
      timestamp: new Date().toISOString(),
      messageType: messageTypeDetermined,
      mediaUrl: mediaUrlPayload || imagePayload || videoPayload || audioPayload || filePayload || undefined,
      imageUrl: imagePayload || undefined,
      videoUrl: videoPayload || undefined,
      audioUrl: audioPayload || undefined,
      thumbnailUrl: thumbnailUrlPayload || undefined,
      fileUrl: filePayload || undefined,
      fileName: namePayload || undefined,
      fileType: typePayload || undefined,
      fileUri: fileUriPayload,
      fileRefName: fileRefNamePayload,
      isUploadedToFileApi: isUploadedToFileApiPayload,
      fileSize: attachedFile?.sizeFormatted,
      mediaSize: attachedFile?.compressedSizeBytes,
      compressionInfo: compressionInfoPayload
    };
    const updatedMessages = [...messages, newMsg];
    
    setMessages(updatedMessages);
    saveMessageToFirestore(newMsg);
    if (!textToSend) setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    userHasScrolledUpRef.current = false;
    scrollToBottom(true, true);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.isUser ? 'user' : 'model',
        text: m.text,
        fileUri: m.fileUri,
        fileType: m.fileType,
        fileRefName: m.fileRefName
      }));

      // THOTH auto-memory: on the FIRST user turn of a conversation, prepend a
      // compact digest of previous conversations so the model remembers facts
      // across chats (the server merges it into the opening user turn).
      // Skipped for content-processing modes (audio_summary/image) where past
      // conversation context is meaningless and only bloats the request.
      const priorUserTurns = updatedMessages.slice(0, -1).filter(m => m.isUser).length;
      const memoryEligibleMode = selectedMode !== 'audio_summary' && selectedMode !== 'image';
      if (memoryEligibleMode && priorUserTurns === 0) {
        const memoryDigest = buildCrossSessionMemory(sessionIdRef.current);
        if (memoryDigest) {
          apiMessages.unshift({ role: 'user', text: memoryDigest });
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiMessages, 
          image: attachedFile?.type?.startsWith('image/') ? (attachedFile?.isUploadedToFileApi ? undefined : imagePayload) : imagePayload,
          audio: audioPayload,
          file: isUploadedToFileApiPayload ? undefined : filePayload,
          fileUri: fileUriPayload,
          fileRefName: fileRefNamePayload,
          fileName: namePayload,
          fileType: typePayload,
          mode: selectedMode,
          userId: userId
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};

      // Distinguish REAL quota limits (server-confirmed) from server/network failures.
      // A 404/500 or offline fetch must NOT be reported as "usage quota exhausted".
      const isRealLimitError = !!(data && data.error && (data.code === 'LIMIT_REACHED' || data.code === 'LOGIN_REQUIRED'));

      if (isRealLimitError) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: isAr
              ? `عذراً، لقد نفد رصيد الاستخدام المتاح لـ ${selectedMode === 'web_search' ? 'البحث' : selectedMode === 'thinking' ? 'التفكير' : 'المحادثة'} اليوم. يرجى تسجيل الدخول أو ترقية باقتك لمتابعة استخدام THOTH بلا حدود.`
              : `Sorry, you have exceeded your available usage quota for ${selectedMode === 'web_search' ? 'Web Search' : selectedMode === 'thinking' ? 'Deep Thinking' : 'Chat'} today. Please sign in or upgrade your subscription for unlimited access.`,
            isUser: false,
            time: timeString,
            isLimitError: true
          }
        ]);
        return;
      }

      if (!response.ok) {
        const serverErrorText = isAr
          ? (response.status === 404
              ? 'تعذر الوصول إلى خادم THOTH: خدمة الـ API غير متاحة حالياً (404). يبدو أن الباك إند غير منشور أو قيد النشر. برجاء المحاولة لاحقاً أو التواصل مع الدعم.'
              : `حدث خطأ في خادم THOTH (رمز ${response.status}). يرجى إعادة المحاولة بعد قليل.`)
          : (response.status === 404
              ? 'Cannot reach the THOTH server: the API service is currently unavailable (404). The backend may not be deployed yet. Please try again later or contact support.'
              : `A THOTH server error occurred (code ${response.status}). Please try again shortly.`);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            text: serverErrorText,
            isUser: false,
            time: timeString,
            isServerError: true
          }
        ]);
        return;
      }
      
      const defaultAiError = isAr ? "عذراً، حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى." : "Sorry, an error occurred while processing the request. Please try again.";
      const defaultNoResp = isAr ? "لا توجد استجابة." : "No response available.";
      const aiMsgText = data.text || data.message || (data.error ? defaultAiError : defaultNoResp);

      // [STUDY TOOLS] The model may append machine-only tags for the LOCAL
      // study tools (alarms/calendar) at the end of its reply. Strip them from
      // everything the user sees/stores, then execute them into the local
      // localStorage store and append ⏰/📅 confirmation lines to the message.
      const studyCmds = extractStudyToolCommands(aiMsgText);
      const studyConfirmLines = applyStudyToolCommands(studyCmds, isAr);
      const aiFinalText = studyConfirmLines.length > 0
        ? `${studyCmds.cleanText}\n\n${studyConfirmLines.join('\n\n')}`
        : studyCmds.cleanText;

      const aiMsg: Message = {
        id: Date.now(),
        text: aiFinalText,
        isUser: false,
        time: timeString,
        sources: data.sources,
        relatedSources: data.relatedSources,
        images: data.images,
        modelUsed: data.modelUsed,
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
        audioSummaryInfo: data.audioSummaryInfo
      };
      
      shouldSmoothScrollRef.current = true;
      setMessages(prev => [...prev, aiMsg]);
      saveMessageToFirestore(aiMsg);
      saveChatToHistory(text, aiFinalText, {
        mediaUrl: mediaUrlPayload || imagePayload || videoPayload || undefined,
        mediaType: typePayload || messageTypeDetermined,
        isVideo: !!videoPayload || messageTypeDetermined === 'video',
        thumbnailUrl: thumbnailUrlPayload || undefined
      });

      // Auto update or create notes in KeepNotes
      const currentNoteId = activeNoteIdRef.current || activeNoteId;
      if (currentNoteId) {
        window.dispatchEvent(new CustomEvent('update-keep-note', {
          detail: {
            id: currentNoteId,
            content: studyCmds.cleanText || data.text
          }
        }));
        
        // Notify the user in the chat with a success message
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 100,
              text: isAr ? `✨ **تم تحديث الملاحظة تلقائياً بالملخص الجديد بنجاح في مساحة العمل!**` : `✨ **Note updated automatically with the new summary in your workspace!**`,
              isUser: false,
              time: timeString
            }
          ]);
        }, 300);
        
        // Disconnect the note after updating it so that subsequent chat messages do not overwrite it!
        setActiveNoteId(null);
      } else if (filePayload || attachedFile) {
        const isQuestions = /(سؤال|أسئلة|اسئلة|اختيار من متعدد|mcq|امتحان|اختبار|questions)/i.test(text) || /(سؤال|أسئلة|اسئلة|اختيار من متعدد|mcq|امتحان|اختبار)/i.test(data.text || '');
        const isNotes = /(ملاحظات|نقاط|key points|takeaways|notes)/i.test(text);
        
        let titleType = isAr ? 'ملخص' : 'Summary';
        let tagType = isAr ? 'تلخيص_AI' : 'AI_Summary';
        let labelType = isAr ? 'الملخص' : 'Summary';
        
        if (isQuestions) {
          titleType = isAr ? 'أسئلة واختبار' : 'Quiz & Questions';
          tagType = isAr ? 'أسئلة_AI' : 'AI_Quiz';
          labelType = isAr ? 'الأسئلة والاختبار' : 'Questions & Quiz';
        } else if (isNotes) {
          titleType = isAr ? 'ملاحظات جوهرية' : 'Key Notes';
          tagType = isAr ? 'ملاحظات_AI' : 'AI_Notes';
          labelType = isAr ? 'الملاحظات' : 'Key Notes';
        }

        const finalTitle = namePayload ? `${titleType}: ${namePayload}` : (isAr ? `${titleType} للمستند 📝` : `${titleType} for Document 📝`);
        window.dispatchEvent(new CustomEvent('create-keep-note', {
          detail: {
            title: finalTitle,
            content: data.text,
            tags: [tagType, (isAr ? 'مستندات' : 'Documents')]
          }
        }));
        
        // Notify the user in the chat with a success message
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 100,
              text: isAr 
                ? `📝 **تم حفظ ${labelType} تلقائياً في ملاحظة باسم "${finalTitle}" في مساحة العمل!**`
                : `📝 **${labelType} automatically saved in a note named "${finalTitle}" in your workspace!**`,
              isUser: false,
              time: timeString
            }
          ]);
        }, 300);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: isAr ? 'عذراً، حدث خطأ أثناء الاتصال بالخادم.' : 'Sorry, a connection error occurred.',
        isUser: false,
        time: isAr ? 'الآن' : 'Now'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (msgId: string | number) => {
    if (isLoading) return;
    const index = messages.findIndex(m => m.id === msgId);
    if (index === -1) return;

    const oldResponseMsg = messages[index];
    const userPromptMsg = messages.slice(0, index).reverse().find(m => m.isUser);

    const contextMessages = messages.slice(0, index);
    if (contextMessages.length === 0) return;

    setMessages(contextMessages);
    setIsLoading(true);

    try {
      const apiMessages = contextMessages.map(m => ({
        role: m.isUser ? 'user' : 'model',
        text: m.text
      }));

      // THOTH auto-memory: mirror the original first-turn request when
      // regenerating the opening response of a fresh conversation.
      const regenUserTurns = contextMessages.filter(m => m.isUser).length;
      const regenMemoryEligible = selectedMode !== 'audio_summary' && selectedMode !== 'image';
      if (regenMemoryEligible && regenUserTurns <= 1) {
        const memoryDigest = buildCrossSessionMemory(sessionIdRef.current);
        if (memoryDigest) {
          apiMessages.unshift({ role: 'user', text: memoryDigest });
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, mode: selectedMode })
      });

      if (!response.ok) throw new Error('API Error');
      
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
      const timeString = isAr 
        ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      // [STUDY TOOLS] Same tag stripping + local execution as handleSend.
      const regenStudyCmds = extractStudyToolCommands(data.text || '');
      const regenConfirmLines = applyStudyToolCommands(regenStudyCmds, isAr);
      const regenFinalText = regenConfirmLines.length > 0
        ? `${regenStudyCmds.cleanText}\n\n${regenConfirmLines.join('\n\n')}`
        : regenStudyCmds.cleanText;

      const newMsg: Message = {
        id: Date.now(),
        text: regenFinalText,
        isUser: false,
        time: timeString,
        sources: data.sources,
        relatedSources: data.relatedSources,
        images: data.images,
        modelUsed: data.modelUsed,
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
        audioSummaryInfo: data.audioSummaryInfo
      };

      setMessages([...contextMessages, newMsg]);

      // Set candidate for A/B Preference collection (RLHF Priority 1)
      if (userPromptMsg && oldResponseMsg && data.text) {
        setPreferenceCandidate({
          prompt: userPromptMsg.text,
          responseA: oldResponseMsg.text,
          responseB: data.text,
          submitted: false
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getReadingTime = (text: string) => {
    if (!text) return isAr ? 'أقل من ثانية' : '< 1 sec';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return isAr ? 'أقل من ثانية' : '< 1 sec';
    
    const seconds = Math.max(1, Math.round((words / 180) * 60));
    if (seconds < 60) return isAr ? `${seconds} ثانية` : `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return isAr ? `${minutes} دقيقة` : `${minutes}m`;
    return isAr ? `${minutes} دقيقة و ${remainingSeconds} ثانية` : `${minutes}m ${remainingSeconds}s`;
  };

  const handleDeleteMessage = async (id: string | number) => {
    const userId = getEffectiveUserId();
    const targetSessionId = sessionIdRef.current;

    // Optimistic UI update
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (targetSessionId) {
        saveLocalSessionMessages(targetSessionId, updated);
      }
      return updated;
    });

    if (userId && targetSessionId) {
      try {
        await deleteChatOrMessage(userId, targetSessionId, String(id));
      } catch (e) {
        console.error('Error deleting message:', e);
      }
    }
  };

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (codeText: string, key: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(key);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const toggleFeedback = (id: string | number, type: 'like' | 'dislike') => {
    const targetMsg = messages.find(m => m.id === id);
    const msgIndex = messages.findIndex(m => m.id === id);
    const prevUserMsg = messages.slice(0, msgIndex).reverse().find(m => m.isUser);

    setFeedback(prev => ({
      ...prev,
      [id]: prev[id] === type ? undefined as any : type
    }));

    if (targetMsg && prevUserMsg) {
      dataProgramService.submitFeedback({
        messageId: String(id),
        prompt: prevUserMsg.text,
        response: targetMsg.text,
        feedbackType: type,
        rating: type === 'like' ? 5 : 1
      });
    }
  };

  const handleOpenEditModal = (msg: Message) => {
    const index = messages.findIndex(m => m.id === msg.id);
    const userMsg = index > 0 ? messages.slice(0, index).reverse().find(m => m.isUser) : null;
    setEditingMsgData({
      msgId: msg.id,
      prompt: userMsg?.text || 'تعليمات المحادثة',
      originalResponse: msg.text,
      currentText: msg.text,
      userNote: '',
      selectedCategory: 'معلومات غير دقيقة ⚠️',
      updateLocalMsg: true,
      isSending: false,
      isSentSuccess: false
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMsgData || editingMsgData.isSending) return;
    setEditingMsgData(prev => prev ? { ...prev, isSending: true } : null);

    try {
      const user = auth.currentUser;
      const userId = user?.uid || localStorage.getItem('app-user-id') || 'anon';

      // 1. Send feedback/note to Admin
      await dataProgramService.submitFeedback({
        messageId: String(editingMsgData.msgId),
        prompt: editingMsgData.prompt,
        response: editingMsgData.originalResponse,
        feedbackType: 'edit',
        reason: editingMsgData.selectedCategory || 'ملاحظات مستخدم',
        editContent: editingMsgData.userNote
          ? `[ملاحظات المستخدم للأدمن]: ${editingMsgData.userNote}\n\n[التعديل على الرد]: ${editingMsgData.currentText}`
          : editingMsgData.currentText,
        userId: userId,
        modelAlias: 'THOTH AI'
      });

      // 2. Submit SFT training example
      await dataProgramService.submitSFT({
        instruction: editingMsgData.prompt,
        response: editingMsgData.originalResponse,
        editedResponse: editingMsgData.currentText !== editingMsgData.originalResponse ? editingMsgData.currentText : undefined,
        category: editingMsgData.selectedCategory,
        userId: userId
      });

      // 3. Update local message if selected
      if (editingMsgData.updateLocalMsg && editingMsgData.currentText !== editingMsgData.originalResponse) {
        setMessages(prev => prev.map(m => m.id === editingMsgData.msgId ? { ...m, text: editingMsgData.currentText } : m));
      }

      setEditingMsgData(prev => prev ? { ...prev, isSending: false, isSentSuccess: true } : null);
      setTimeout(() => {
        setEditingMsgData(null);
      }, 1800);
    } catch (err) {
      console.error("Error submitting user feedback to admin:", err);
      setEditingMsgData(prev => prev ? { ...prev, isSending: false } : null);
    }
  };

  const handleSpeak = async (id: string | number, text: string) => {
    // If already playing this message, stop it
    if (speakingId === id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingId(null);
      return;
    }

    // Stop any existing audio or speech
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingId(id);

    // Clean text for TTS (remove code blocks, markdown symbols)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*`_~]/g, '')
      .trim();

    if (!cleanText) {
      setSpeakingId(null);
      return;
    }

    const preferredVoice = localStorage.getItem('thoth_selected_voice') || 'Puck';

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.length > 500 ? cleanText.substring(0, 500) + '...' : cleanText,
          voice: preferredVoice
        })
      });

      const data = await res.json();
      if (data.success && data.audioData) {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`);
        activeAudioRef.current = audio;
        audio.onended = () => {
          setSpeakingId(null);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          fallbackBrowserSpeech(cleanText, id);
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('Model TTS error, falling back to browser speech:', e);
    }

    // Fallback to browser speech synthesis
    fallbackBrowserSpeech(cleanText, id);
  };

  const fallbackBrowserSpeech = (cleanText: string, id: string | number) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.05;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingId(null);
    }
  };

    const toggleMic = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop microphone tracks immediately so hardware mic closes
        try {
          stream.getTracks().forEach(track => {
            track.enabled = false;
            track.stop();
          });
        } catch (e) {}

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          
          try {
            setInput(prev => prev ? prev + ' (جاري الاستماع...)' : '(جاري الاستماع...)');
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Audio })
            });
            const data = await res.json();
            setInput(prev => {
              const clean = prev.replace(' (جاري الاستماع...)', '').replace('(جاري الاستماع...)', '').trim();
              return clean ? clean + ' ' + data.text : data.text;
            });
          } catch (e) {
            console.warn('Transcription notice:', e);
            setInput(prev => prev.replace(' (جاري الاستماع...)', '').replace('(جاري الاستماع...)', '').trim());
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err: any) {
      console.warn('Microphone permission/access notice in Chat:', err?.name || err?.message || err);
      setIsRecording(false);
    }
  };

  // Handle incoming initial message
  useEffect(() => {
    if (initialMessage && !isLoading) {
      if (typeof initialMessage === 'object' && initialMessage !== null) {
        if ('noteId' in initialMessage && initialMessage.noteId) {
          setActiveNoteId(initialMessage.noteId);
        } else {
          setActiveNoteId(null);
        }
        handleSend(initialMessage);
      } else {
        setActiveNoteId(null);
        handleSend(initialMessage);
      }
      if (clearInitialMessage) {
        clearInitialMessage();
      }
    }
  }, [initialMessage, isLoading, messages.length]);

  return (
    <div className="flex flex-col w-full h-full pt-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-hidden relative">
      {/* Top action bar for Chat */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            type="button"
            onClick={(e) => {
              if (onNavigate) {
                onNavigate('history');
              } else {
                handleOpenSidebar(e);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-2xl text-gray-200 hover:text-white text-xs font-bold transition-all border border-white/[0.12] hover:border-white/25 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.2)] group max-w-[180px] sm:max-w-[220px] cursor-pointer relative z-20"
            title={language === 'ar' ? 'فتح سجل المحادثات' : 'Open Chat History'}
          >
            <PanelLeftOpen className={`w-3.5 h-3.5 ${theme.textAccent} group-hover:scale-110 transition-transform shrink-0`} />
            <span className="truncate">{currentChatTitle || (language === 'ar' ? 'سجل المحادثات' : 'Chat History')}</span>
          </button>

          {/* Model Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] text-[11px] font-medium text-gray-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-bold text-gray-200">THOTH 2.5 Flash</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            onClick={handleQuickShare}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-2xl text-gray-300 hover:text-white text-xs font-bold transition-all border border-white/[0.12] hover:border-white/25 active:scale-95 shadow-sm ${shareCopied ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : ''}`}
            title={language === 'ar' ? 'مشاركة المحادثة' : 'Quick Share'}
          >
            {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className={`w-3.5 h-3.5 ${theme.textAccent}`} />}
            <span className="hidden sm:inline">{shareCopied ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'مشاركة' : 'Share')}</span>
          </button>

          <button 
            onClick={handleNewChat}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl ${theme.btnPrimary} text-white text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer`}
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>{language === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
          </button>
        </div>
      </div>

      {/* Slide-out Chat History Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in cursor-pointer"
            onClick={handleCloseSidebar}
          />

          {/* Drawer Sidebar Content */}
          <div className="relative w-full max-w-sm sm:max-w-md h-full bg-[#080a14]/90 backdrop-blur-3xl border-l sm:border-x border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.03] backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/25">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{language === 'ar' ? 'سجل المحادثات' : 'Chat History'}</h2>
                  <span className="text-[10px] text-gray-400">{sessionsList.length} {language === 'ar' ? 'جلسة محفوظة' : 'saved sessions'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-pink-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'جديدة' : 'New'}</span>
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search within Drawer */}
            <div className="p-3 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
              <div className="relative flex items-center bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl focus-within:border-pink-500/50 transition-all">
                <Search className="w-4 h-4 text-gray-400 ml-2.5" />
                <input 
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث في العناوين...' : 'Search chats...'}
                  className="w-full bg-transparent text-white placeholder:text-gray-500 text-xs py-2 pl-3 pr-2 focus:outline-none"
                />
                {sidebarSearch && (
                  <button onClick={() => setSidebarSearch('')} className="p-1 text-gray-400 hover:text-white mr-1.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
              {sessionsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                  <Bot className="w-10 h-10 mb-2 opacity-40 text-pink-400" />
                  <p className="text-xs">{language === 'ar' ? 'لا توجد محادثات سابقة بعد' : 'No previous chats yet'}</p>
                </div>
              ) : (
                sessionsList
                  .filter(s => !sidebarSearch || s.title.toLowerCase().includes(sidebarSearch.toLowerCase()) || (s.desc && s.desc.toLowerCase().includes(sidebarSearch.toLowerCase())))
                  .map((session) => {
                    const isActive = session.id === currentSessionId;
                    const isEditing = editingSessionId === session.id;
                    const isVid = session.lastMediaType === 'video';
                    const isImg = session.lastMediaType === 'image' || (!isVid && !!session.lastMediaThumbnail);

                    return (
                      <div
                        key={session.id}
                        onClick={() => !isEditing && switchSession(session.id)}
                        className={`group relative flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-2xl ${
                          isActive 
                            ? 'bg-pink-500/20 border-pink-500/50 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)]' 
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden backdrop-blur-md ${
                            session.lastMediaThumbnail ? 'border-white/20' :
                            isActive ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 
                            'bg-white/5 text-gray-400 border-white/10'
                          }`}>
                            {session.lastMediaThumbnail ? (
                              <img src={session.lastMediaThumbnail} alt="Thumb" className="w-full h-full object-cover" />
                            ) : session.isPinned ? (
                              <Pin className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
                            ) : isVid ? (
                              <Video className="w-3.5 h-3.5 text-purple-400" />
                            ) : isImg ? (
                              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <form 
                                onSubmit={(e) => handleSaveRenameSession(session.id, editingSessionTitle, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5"
                              >
                                <input 
                                  type="text"
                                  value={editingSessionTitle}
                                  onChange={(e) => setEditingSessionTitle(e.target.value)}
                                  autoFocus
                                  className="w-full bg-white/10 backdrop-blur-md border border-pink-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
                                />
                                <button type="submit" className="p-1 rounded bg-pink-500 text-white hover:bg-pink-600">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => setEditingSessionId(null)} className="p-1 rounded bg-white/10 text-white">
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <>
                                <h4 className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                  {session.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                                  {session.desc || (language === 'ar' ? 'جلسة محادثة ذكاء اصطناعي' : 'Chat session')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleTogglePinSession(session.id, session.isPinned, e)}
                              className={`p-1 rounded-lg hover:bg-white/10 ${session.isPinned ? 'text-pink-400' : 'text-gray-400 hover:text-white'}`}
                              title={session.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(session.id);
                                setEditingSessionTitle(session.title);
                              }}
                              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                              title="تعديل العنوان"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-white/[0.08] shrink-0 bg-white/[0.02]">
              {onNavigate && (
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    onNavigate('history');
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer backdrop-blur-xl"
                >
                  <HistoryIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>{language === 'ar' ? 'عرض مركز سجل المحادثات الكامل' : 'Open Full History Center'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ad Placement Slot */}
      <AdPlacement placementId="chat_sidebar" className="mb-4" />

      {activeNoteId && (
        <div className="mb-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3 animate-fade-in shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/50 font-semibold">{isAr ? 'المحادثة متصلة حالياً بالملاحظة' : 'Chat is currently linked to note'}</div>
              <div className="text-xs font-bold text-indigo-200 truncate pr-0.5">{getActiveNoteTitle()}</div>
            </div>
          </div>
          <button 
            onClick={() => setActiveNoteId(null)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold transition-all border border-white/5 active:scale-95 shrink-0"
          >
            {isAr ? 'إلغاء الاتصال' : 'Disconnect'}
          </button>
        </div>
      )}

      {/* Human Preference Comparison Banner (RLHF Priority 1) */}
      {preferenceCandidate && !preferenceCandidate.submitted && (
        <div className="w-full mb-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-slate-900/90 border border-purple-500/40 text-white shadow-2xl backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{isAr ? 'تقييم التفضيل البشري (Human Preference RLHF Data)' : 'Human Preference RLHF Evaluation'}</span>
            </div>
            <button
              onClick={() => setPreferenceCandidate(null)}
              className="p-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            {isAr 
              ? 'لقد قمت بإعادة توليد الإجابة. أي من الاستجابتين تفضل اعتمادها لتطوير نموذج الذكاء الاصطناعي؟'
              : 'You regenerated the answer. Which of these responses do you prefer for training and evaluating THOTH AI?'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={async () => {
                await dataProgramService.submitPreference({
                  prompt: preferenceCandidate.prompt,
                  responseA: preferenceCandidate.responseA,
                  responseB: preferenceCandidate.responseB,
                  preferredResponse: 'A',
                  reason: isAr ? 'المستخدم فضل الاستجابة الأولى' : 'User preferred response A'
                });
                setPreferenceCandidate(prev => prev ? { ...prev, submitted: true } : null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              {isAr ? '👈 الإجابة الأولى (A)' : '👈 First Response (A)'}
            </button>
            <button
              onClick={async () => {
                await dataProgramService.submitPreference({
                  prompt: preferenceCandidate.prompt,
                  responseA: preferenceCandidate.responseA,
                  responseB: preferenceCandidate.responseB,
                  preferredResponse: 'B',
                  reason: isAr ? 'المستخدم فضل الاستجابة الجديدة' : 'User preferred response B'
                });
                setPreferenceCandidate(prev => prev ? { ...prev, submitted: true } : null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/30 text-indigo-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              {isAr ? '👉 الإجابة الجديدة (B)' : '👉 New Response (B)'}
            </button>
          </div>
        </div>
      )}

      <div ref={messagesContainerRef} onScroll={handleContainerScroll} className="flex flex-col flex-1 gap-6 overflow-y-auto hide-scrollbar pb-44">
        {messages.length === 0 && (
          isAuth ? (
            <div className="flex flex-col items-center justify-center w-full h-full my-auto animate-fade-in">
              <Discover onAction={handleSend} onNavigate={onNavigate} isEmbedded={true} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-10 text-center">
              <div className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${theme.previewGradient} flex items-center justify-center text-white shadow-2xl border border-white/20 mb-4 animate-bounce`}>
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-6">
                {isAr ? 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟' : 'Welcome! How can I help you today?'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  { 
                    title: isAr ? '🎙️ المحادثة الصوتية' : '🎙️ Live Voice', 
                    prompt: isAr ? 'حدثني بصوت THOTH Live عن أهمية الذكاء الاصطناعي' : 'Tell me about the power of multimodal AI' 
                  },
                  { 
                    title: isAr ? '🌐 الترجمة الفورية' : '🌐 Instant Translation', 
                    prompt: isAr ? 'قم بترجمة هذا النص فورياً باستخدام قدرات THOTH' : 'Translate and explain key concepts between languages' 
                  },
                  { 
                    title: isAr ? '💻 مساعد الكود' : '💻 Code Assistant', 
                    prompt: isAr ? 'اكتب كود بايثون مع شرح تفصيلي بأسلوب THOTH' : 'Write a clean TypeScript React component with explanations' 
                  },
                  { 
                    title: isAr ? '🧠 التفكير العميق' : '🧠 Deep Thinking', 
                    prompt: isAr ? 'اشرح لي المفاهيم المعقدة خطوة بخطوة' : 'Explain complex problem solving step by step' 
                  },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(card.prompt)}
                    className={`p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:${theme.borderAccent} ${isAr ? 'text-right' : 'text-left'} transition-all group shadow-lg active:scale-95`}
                  >
                    <h4 className={`text-xs font-bold text-white group-hover:${theme.textAccentBright} flex items-center gap-1.5`}>
                      <span>{card.title}</span>
                    </h4>
                    <p className="text-[11px] text-white/50 mt-1 line-clamp-2 leading-relaxed">{card.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Storage Limit Error Banner */}
        {storageErrorBanner && (
          <div className="w-full mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-rose-950/80 border border-red-500/50 text-white shadow-2xl backdrop-blur-md flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-red-300">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{isAr ? 'تنبيه امتلئ التخزين (Storage Full)' : 'Storage Full Alert'}</span>
              </div>
              <button
                onClick={() => setStorageErrorBanner(null)}
                className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-red-100/90 leading-relaxed">
              {storageErrorBanner.message}
            </p>
            <div className="mt-2 flex justify-start">
              <button 
                onClick={() => {
                  setStorageErrorBanner(null);
                  onNavigate?.('history');
                }} 
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-medium rounded-lg border border-red-500/30 transition-colors"
              >
                {isAr ? 'إدارة المحادثات' : 'Manage Chats'}
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col w-full group ${msg.isUser ? 'items-start' : 'items-end'}`}>
            <div className={`flex items-start gap-3 w-full md:max-w-[90%] ${msg.isUser ? 'flex-row-reverse self-start' : 'flex-row self-end'}`}>
              
              {/* Bubble / Container */}
              <div 
                id={`msg-${msg.id}`}
                className={`flex-1 min-w-0 transition-all ${
                  msg.isUser 
                    ? 'bg-white/[0.08] backdrop-blur-xl text-gray-100 rounded-2xl px-4 py-3 border border-white/10 max-w-[85%] shadow-md' 
                    : 'bg-transparent text-gray-100 py-1 px-1'
                }`}
              >
                {/* Header label for AI response */}
                {!msg.isUser && (
                  <div className={`flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-bold ${theme.textAccent}`}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className={`w-3.5 h-3.5 ${theme.textAccent}`} />
                      <span>THOTH</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-normal">{msg.time}</span>
                  </div>
                )}

                {/* Message Content */}
                {msg.isUser ? (
                  <div className="flex flex-col gap-2">
                    {/* Video Player */}
                    {(msg.videoUrl || (msg.mediaUrl && msg.messageType === 'video')) && (
                      <div className="rounded-xl overflow-hidden border border-white/15 max-h-56 max-w-sm self-start shadow-md mb-1.5 bg-black/50">
                        <video 
                          src={msg.videoUrl || msg.mediaUrl} 
                          poster={msg.thumbnailUrl}
                          controls 
                          playsInline
                          className="w-full max-h-56 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Image Viewer */}
                    {(msg.imageUrl || (msg.mediaUrl && (msg.messageType === 'image' || !msg.messageType && !msg.videoUrl))) && !msg.videoUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/10 max-h-56 max-w-xs self-start shadow-md mb-1.5 group/img relative">
                        <img 
                          src={msg.imageUrl || msg.mediaUrl} 
                          alt="Attached Visual" 
                          className="object-cover max-h-56 w-full cursor-pointer hover:scale-105 transition-transform duration-200" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const origSrc = msg.imageUrl || msg.mediaUrl;
                            if (origSrc && !target.src.includes('/api/image-proxy')) {
                              target.src = `/api/image-proxy?url=${encodeURIComponent(origSrc)}`;
                            }
                          }}
                        />
                        <a 
                          href={msg.imageUrl || msg.mediaUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          download={msg.fileName || 'image.jpg'}
                          className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                          title={isAr ? "فتح أو تحميل الصورة" : "Open or download image"}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Audio Player */}
                    {(msg.audioUrl || (msg.mediaUrl && msg.messageType === 'audio')) && (
                      <div className="mb-1.5 self-start w-full max-w-xs">
                        <audio src={msg.audioUrl || msg.mediaUrl} controls className="w-full h-8 scale-90 origin-right rounded-lg bg-white/5" />
                      </div>
                    )}

                    {/* Document / File Preview */}
                    {(msg.fileUrl || msg.fileUri || (msg.mediaUrl && msg.messageType === 'file')) && (
                      <div className="mb-1.5 self-start w-full max-w-xs p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white/90 truncate">{msg.fileName || (isAr ? 'ملف مرفق' : 'Attached file')}</span>
                            {(msg.isUploadedToFileApi || msg.fileUri) && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                                Files API ⚡
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/40 truncate">
                            {msg.fileType || (isAr ? 'مستند' : 'Document')} {msg.fileSize ? `(${msg.fileSize})` : ''}
                          </span>
                        </div>
                        {(msg.fileUrl || msg.mediaUrl) && (
                          <a 
                            href={msg.fileUrl || msg.mediaUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            download={msg.fileName || 'file'}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title={isAr ? "تحميل الملف" : "Download file"}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Compression Savings Badge */}
                    {msg.compressionInfo && msg.compressionInfo.savingsPercentage > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 rounded-full w-fit mb-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>
                          {isAr 
                            ? `تم الضغط محلياً: توفير ${msg.compressionInfo.savingsPercentage}% من حجم التخزين` 
                            : `Locally compressed: saved ${msg.compressionInfo.savingsPercentage}% storage`}
                        </span>
                      </div>
                    )}

                    <p className="font-body-md text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ) : msg.isLimitError ? (
                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <p className="text-sm leading-relaxed text-amber-100 font-medium">{msg.text}</p>
                    </div>
                    <div className="flex gap-3 items-center mt-2 justify-end">
                      <button 
                        onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
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
                        {isAr ? 'صفحة الخطط' : 'Plans & Pricing'}
                      </button>
                    </div>
                  </div>
                ) : msg.isServerError ? (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      <p className="text-sm leading-relaxed text-red-100 font-medium">{msg.text}</p>
                    </div>
                    <div className="flex gap-3 items-center justify-end">
                      <button
                        onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                        className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-all"
                      >
                        {isAr ? 'حسناً' : 'OK'}
                      </button>
                    </div>
                  </div>
                ) : (msg.sources && msg.sources.length > 0) ? (
                  <SearchResultView
                    text={!msg.isUser && msg.text ? sanitizeStudyTags(msg.text) : msg.text}
                    sources={msg.sources}
                    relatedSources={msg.relatedSources}
                    images={msg.images}
                  />
                ) : (!msg.isUser && (
                  (msg.images && msg.images.length > 0 && msg.images[0]?.url) ||
                  msg.imageUrl ||
                  (msg.text && (msg.text.includes('![') || msg.text.includes('image.pollinations.ai') || /generate_image/i.test(msg.text) || msg.text.match(/https?:\/\/[^\s\)]+?\.(?:png|jpg|jpeg|webp|gif)/i)))
                )) ? (() => {
                  let imgUrl = (msg.images && msg.images.length > 0) ? msg.images[0].url : msg.imageUrl;
                  let imgDesc = (msg.images && msg.images.length > 0) ? msg.images[0].description : msg.fileName;

                  if (!imgUrl && msg.text) {
                    const mdMatch = msg.text.match(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/);
                    if (mdMatch) {
                      imgUrl = mdMatch[2];
                      imgDesc = mdMatch[1] || (isAr ? 'صورة مولدة' : 'Generated Image');
                    } else {
                      const pollMatch = msg.text.match(/(https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+)/i);
                      if (pollMatch) {
                        imgUrl = pollMatch[1];
                        imgDesc = isAr ? 'صورة مولدة بالذكاء الاصطناعي' : 'Generated AI Image';
                      } else {
                        const rawMatch = msg.text.match(/(https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif))/i);
                        if (rawMatch) {
                          imgUrl = rawMatch[1];
                          imgDesc = isAr ? 'صورة' : 'Image';
                        } else if (/generate_image/i.test(msg.text) || /"image_prompt"/i.test(msg.text)) {
                          try {
                            const cleanJson = msg.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
                            const parsed = JSON.parse(cleanJson);
                            const prompt = parsed.prompt || parsed.image_prompt || parsed.description;
                            if (prompt) {
                              imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=42`;
                              imgDesc = prompt;
                            }
                          } catch (e) {
                            const promptMatch = msg.text.match(/"prompt"\s*:\s*"([^"]+)"/i) || msg.text.match(/"image_prompt"\s*:\s*"([^"]+)"/i);
                            if (promptMatch && promptMatch[1]) {
                              imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptMatch[1])}?width=1024&height=1024&nologo=true&seed=42`;
                              imgDesc = promptMatch[1];
                            }
                          }
                        }
                      }
                    }
                  }

                  if (!imgUrl) return null;

                  const cleanText = msg.text
                    ? msg.text
                        .replace(/!\[.*?\]\(.*?\)/g, '')
                        .replace(/https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+/gi, '')
                        .replace(/https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif)/gi, '')
                        .replace(/\*\(Prompt:.*?\)\*/gi, '')
                        .replace(/\[Prompt:.*?\]/gi, '')
                        .replace(/```(?:json)?[\s\S]*?```/gi, '')
                        .replace(/\{[\s\S]*?"action"\s*:\s*"generate_image"[\s\S]*?\}/gi, '')
                        .trim()
                    : '';

                  return (
                    <div className="flex flex-col gap-3 mt-2">
                      {cleanText && (
                        <div className="markdown-body text-sm leading-relaxed text-gray-100 space-y-2">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <div className="mb-2 leading-relaxed text-gray-200">{children}</div>,
                              strong: ({ children }) => <strong className="font-bold text-white bg-white/10 px-1 rounded">{children}</strong>,
                              code({ inline, className, children, ...props }: any) {
                                if (inline) {
                                  return (
                                    <code className={`bg-white/15 ${theme.textAccentBright} px-1.5 py-0.5 rounded text-xs font-mono`} dir="ltr" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <pre className="p-3 bg-black/40 rounded-xl text-xs font-mono overflow-x-auto my-2 text-indigo-300">
                                    <code>{children}</code>
                                  </pre>
                                );
                              }
                            }}
                          >
                            {cleanText}
                          </ReactMarkdown>
                        </div>
                      )}
                      
                      <div className="relative group rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 shadow-xl bg-white/[0.03] backdrop-blur-xl max-w-lg cursor-pointer transition-all duration-300">
                        <img 
                          src={imgUrl} 
                          alt={imgDesc || 'Generated AI Image'} 
                          onClick={() => setPreviewImageModalUrl(imgUrl!)}
                          className="w-full h-auto max-h-[420px] object-contain transition-transform duration-300 group-hover:scale-[1.02] bg-black/20"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (!target.src.includes('/api/image-proxy')) {
                              target.src = `/api/image-proxy?url=${encodeURIComponent(imgUrl!)}`;
                            }
                          }}
                        />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-sm flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-[11px] font-bold text-white/90 px-2 truncate max-w-[200px]">
                            {imgDesc || (isAr ? 'صورة مولدة بالذكاء الاصطناعي' : 'AI Generated Image')}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImageModalUrl(imgUrl!);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xl rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                              title={isAr ? "توسيع ومعاينة الصورة" : "Expand and preview image"}
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              {isAr ? 'معاينة' : 'Preview'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInput((isAr ? 'تعديل الصورة: ' : 'Edit image: ') + (imgDesc && imgDesc !== 'Generated AI Image' ? imgDesc : ''));
                                setTimeout(() => {
                                  const textarea = document.querySelector('textarea');
                                  if (textarea) textarea.focus();
                                }, 100);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xl rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              {isAr ? 'تعديل' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (!imgUrl) return;
                                  const res = await fetch(imgUrl);
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `thoth_image_${Date.now()}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  if (imgUrl) {
                                    window.open(imgUrl, '_blank');
                                  }
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/25 backdrop-blur-xl rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {isAr ? 'تحميل' : 'Download'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="markdown-body text-sm leading-relaxed text-gray-100 space-y-2">
                    {!msg.isUser && (msg.audioUrl || msg.audioSummaryInfo) && (
                      <div className="mb-3 w-full">
                        <AudioSummaryPlayer
                          audioUrl={msg.audioUrl}
                          title={msg.audioSummaryInfo?.title || (isAr ? 'ملخص صوتي ذكي' : 'Smart Audio Summary')}
                          duration={msg.audioSummaryInfo?.duration || msg.audioDuration}
                          voiceName={msg.audioSummaryInfo?.voiceName}
                          script={msg.audioSummaryInfo?.script}
                          status={msg.audioSummaryInfo?.status || (msg.audioUrl ? 'ready' : undefined)}
                          sourceType={msg.audioSummaryInfo?.sourceType}
                        />
                      </div>
                    )}
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <div className="mb-2 leading-relaxed text-gray-200">{children}</div>,
                        img: ({ src, alt }: any) => {
                          if (!src) return null;
                          return (
                            <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-2xl my-2 max-w-lg">
                              <img 
                                src={src} 
                                alt={alt || (isAr ? 'صورة' : 'Image')} 
                                className="w-full h-auto max-h-[400px] object-contain bg-black/40"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (!target.src.includes('/api/image-proxy')) {
                                    target.src = `/api/image-proxy?url=${encodeURIComponent(src)}`;
                                  }
                                }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <a
                                  href={src}
                                  target="_blank"
                                  rel="noreferrer"
                                  download="thoth_image.png"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/80 hover:bg-indigo-500 border border-indigo-400/30 backdrop-blur-md rounded-lg text-xs font-bold text-white transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {isAr ? 'تحميل' : 'Download'}
                                </a>
                              </div>
                            </div>
                          );
                        },
                        a: ({ href, children }: any) => {
                          if (href && (href.match(/\.(png|jpg|jpeg|webp|gif)($|\?)/i) || href.includes('image.pollinations.ai'))) {
                            return (
                              <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-2xl my-2 max-w-lg">
                                <img 
                                  src={href} 
                                  alt={typeof children === 'string' ? children : (isAr ? 'صورة' : 'Image')} 
                                  className="w-full h-auto max-h-[400px] object-contain bg-black/40"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    if (!target.src.includes('/api/image-proxy')) {
                                      target.src = `/api/image-proxy?url=${encodeURIComponent(href)}`;
                                    }
                                  }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    download="thoth_image.png"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/80 hover:bg-indigo-500 border border-indigo-400/30 backdrop-blur-md rounded-lg text-xs font-bold text-white transition-all"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    {isAr ? 'تحميل' : 'Download'}
                                  </a>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className={`${theme.textAccent} underline hover:brightness-125`}>
                              {children}
                            </a>
                          );
                        },
                        h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-2 border-b border-white/10 pb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className={`text-base font-bold ${theme.textAccentBright} mt-3 mb-1.5`}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-200 mt-2 mb-1">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 pr-2 text-gray-200">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 pr-2 text-gray-200">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-white bg-white/10 px-1 rounded">{children}</strong>,
                        blockquote: ({ children }) => <blockquote className={`border-r-4 ${theme.borderAccent} pr-3 my-2 text-gray-300 italic bg-white/5 py-1 rounded-l`}>{children}</blockquote>,
                        code({ node, inline, className, children, ...props }: any) {
                          const codeString = String(children).replace(/\n$/, '');
                          const codeKey = `${msg.id}-${codeString.substring(0, 15)}`;
                          const match = /language-(\w+)/.exec(className || '');
                          const lang = match ? match[1] : '';
                          
                          if (inline) {
                            return (
                              <code className={`bg-white/15 ${theme.textAccentBright} px-1.5 py-0.5 rounded text-xs font-mono`} dir="ltr" {...props}>
                                {children}
                              </code>
                            );
                          }

                          const isArtifactCandidate = (
                            ['html', 'svg', 'jsx', 'tsx', 'javascript', 'js'].includes(lang.toLowerCase()) ||
                            codeString.includes('<!DOCTYPE') ||
                            codeString.includes('<html') ||
                            codeString.includes('<svg')
                          ) && codeString.length > 120;

                          if (isArtifactCandidate) {
                            return (
                              <ArtifactViewer
                                content={codeString}
                                language={lang || 'html'}
                                title={isAr ? "معاينة محتوى THOTH (Artifact)" : "THOTH Artifact Preview"}
                                isOpen={openArtifactKey === codeKey}
                                onToggle={(open) => setOpenArtifactKey(open ? codeKey : null)}
                              />
                            );
                          }

                          return (
                            <div className="my-3 rounded-xl overflow-hidden border border-white/15 bg-black/30 backdrop-blur-md shadow-xl text-left" dir="ltr">
                              <div className="bg-white/5 backdrop-blur-md px-4 py-1.5 flex items-center justify-between text-xs text-gray-400 border-b border-white/10">
                                <span className="font-mono text-[11px] text-gray-300">{lang || 'code'}</span>
                                <button
                                  onClick={() => handleCopyCode(codeString, codeKey)}
                                  className="flex items-center gap-1 hover:text-white transition-colors text-[11px] bg-white/10 px-2 py-0.5 rounded"
                                >
                                  {copiedCodeIndex === codeKey ? (
                                    <>
                                      <CheckCheck className={`w-3 h-3 ${theme.textAccent}`} />
                                      <span className={`${theme.textAccent} font-bold`}>{isAr ? 'تم النسخ' : 'Copied'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>{isAr ? 'نسخ الكود' : 'Copy Code'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className={`p-4 text-xs font-mono overflow-x-auto ${theme.textAccentBright} leading-relaxed`}>
                                <code>{children}</code>
                              </pre>
                            </div>
                          );
                        }
                      }}
                    >
                      {!msg.isUser && msg.text && msg.text.includes('[[') ? sanitizeStudyTags(msg.text) : msg.text}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* [Task 34] Owner request: when this reply created tasks (a study
                    plan), show a jump button straight to the Tasks page where
                    the plan now lives grouped as one course. Render-time text
                    detection — zero data-model changes, works for old messages. */}
                {!msg.isUser && msg.text && /📋 \*\*(تمت إضافة|Added)/.test(msg.text) && (
                  <button
                    onClick={() => onNavigate?.('tasks')}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-purple-500/15 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-200 text-xs font-black shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                    title={isAr ? 'فتح صفحة المهام' : 'Open the Tasks page'}
                  >
                    <ListTodo className="w-4 h-4 text-emerald-300" />
                    <span>{isAr ? 'افتح صفحة المهام — خطتك متجمعة هناك كدرس واحد 🗂️' : 'Open the Tasks page — your plan is grouped there as one course'}</span>
                  </button>
                )}

                {/* THOTH Actions Footer for messages */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10 text-white/50 text-xs">
                  <div className="flex items-center gap-1 text-[10px] text-white/50 font-medium">
                    <Clock className="w-3 h-3 text-white/60" />
                    <span>{isAr ? 'وقت القراءة: ' : 'Read time: '}{getReadingTime(msg.text)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {!msg.isUser && (
                      <>
                        <button 
                          onClick={() => toggleFeedback(msg.id, 'like')}
                          title={isAr ? "إعجاب بالرد" : "Like response"}
                          className={`p-1.5 hover:text-white transition-colors rounded hover:bg-white/10 ${feedback[msg.id] === 'like' ? '${theme.textAccent} ${theme.bgAccent}' : ''}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => toggleFeedback(msg.id, 'dislike')}
                          title={isAr ? "عدم إعجاب" : "Dislike response"}
                          className={`p-1.5 hover:text-white transition-colors rounded hover:bg-white/10 ${feedback[msg.id] === 'dislike' ? 'text-red-400 bg-red-500/20' : ''}`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRegenerate(msg.id)}
                          title={isAr ? "إعادة التوليد" : "Regenerate response"}
                          className="p-1.5 hover:text-white transition-colors rounded hover:bg-white/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          title={isAr ? "قراءة صوتیة" : "Read aloud"}
                          className={`p-1.5 hover:text-white transition-colors rounded hover:bg-white/10 ${speakingId === msg.id ? `${theme.textAccent} animate-pulse ${theme.bgAccent}` : ''}`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title={isAr ? "نسخ النص كامل" : "Copy text"}
                          className="p-1.5 hover:text-white transition-colors rounded hover:bg-white/10"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 ${theme.textAccent}" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {isAuth && (
                          <>
                            <button 
                              onClick={() => handleSaveToTasks(msg.id, msg.text)}
                              title={isAr ? "حفظ إلى المهام" : "Save to Tasks"}
                              className={`p-1.5 hover:text-white transition-colors rounded hover:bg-white/10 ${savedToTasksId === msg.id ? 'text-blue-300 bg-blue-500/20' : ''}`}
                            >
                              {savedToTasksId === msg.id ? <Check className="w-3.5 h-3.5 text-blue-300" /> : <ListTodo className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => handleSaveToKeep(msg.id, msg.text)}
                              title={isAr ? "حفظ إلى الملاحظات" : "Save to Notes"}
                              className={`p-1.5 hover:text-white transition-colors rounded hover:bg-white/10 ${savedToKeepId === msg.id ? 'text-amber-300 bg-amber-500/20' : ''}`}
                            >
                              {savedToKeepId === msg.id ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Bookmark className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      title={isAr ? "حذف الرسالة" : "Delete message"}
                      className="p-1.5 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 rounded hover:bg-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {msg.isUser && (
              <span className="text-[10px] text-white/40 mt-1 mr-2">{msg.time}</span>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col w-full items-end">
            <div className="flex items-start gap-3 w-full md:max-w-[90%] flex-row">
              <div className="py-3.5 px-4.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex flex-col gap-2.5 text-white shadow-2xl animate-fade-in min-w-[280px] sm:min-w-[340px]">
                
                {/* 1. Image Generation Animation */}
                {selectedMode === 'image' ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-pink-400 border-b border-white/10 pb-2">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
                        {isAr ? 'استوديو توليد الصور الفنية (THOTH)' : 'AI Art & Image Studio (THOTH)'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-bold border border-pink-500/25">
                        1024x1024 HD
                      </span>
                    </div>

                    <div className="relative flex items-center justify-center p-4 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                      {/* Animated visual canvas sweep */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                          <ImageIcon className="w-7 h-7 text-pink-400 animate-pulse" />
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">
                            {isAr ? 'جاري رسم وتوليد تفاصيل الصورة...' : 'Painting and rendering image details...'}
                          </span>
                          <span className="text-[10px] text-pink-300/80">
                            {isAr ? 'هندسة الإضاءة، الأبعاد، وتناسق الألوان الفنية' : 'Engineering lighting, perspective, and color harmony'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : 

                /* 2. Audio Summary & Podcast Studio Animation */
                selectedMode === 'audio_summary' ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-emerald-400 border-b border-white/10 pb-2">
                      <span className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        {isAr ? 'استوديو البودكاست والملخص الصوتي (THOTH Audio)' : 'THOTH Voice & Podcast Studio'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25">
                        HD Studio
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                          <Volume2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">
                            {isAr ? 'جاري إعداد وهندسة البودكاست الصوتي...' : 'Engineering smart audio podcast...'}
                          </span>
                          <span className="text-[10px] text-emerald-300/80">
                            {isAr ? 'تحليل المحتوى وهندسة النبرة الصوتية الواقعية' : 'Analyzing content & generating natural human voice'}
                          </span>
                          {slowAudioHint && (
                            <span className="text-[10px] text-amber-300/90 font-medium mt-0.5">
                              {isAr ? '⏳ المعالجة ممكن تاخد من دقيقة لتلات دقايق في أوقات الضغط العالي — ميزتك بتحفظ عادي' : '⏳ Processing may take 1–3 minutes under heavy load — your quota is safe'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equalizer Frequency Waves */}
                      <div className="flex items-end gap-1 h-6 px-2">
                        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                        <span className="w-1 bg-teal-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-5" />
                        <span className="w-1 bg-emerald-300 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4" />
                        <span className="w-1 bg-teal-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-6" />
                      </div>
                    </div>
                  </div>
                ) : 

                /* 3. Deep Thinking Reasoning Animation */
                selectedMode === 'thinking' ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-purple-400 border-b border-white/10 pb-2">
                      <span className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                        {isAr ? 'التفكير العميق والتحليل المنطقي (Deep Reasoning)' : 'Deep Reasoning & Logic Engine'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">
                          {isAr ? 'جاري تفكيك المسألة والتحليل خطوة بخطوة...' : 'Analyzing problem step-by-step...'}
                        </span>
                        <span className="text-[10px] text-purple-300/80">
                          {isAr ? 'استدعاء المعارف المتقدمة وتدقيق البراهين' : 'Formulating structured reasoning and verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : 

                /* 4. Live Web Search Animation */
                selectedMode === 'web_search' ? (
                  <div className="flex flex-col gap-2 min-w-[260px] sm:min-w-[320px]">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-400 border-b border-white/10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        {isAr ? 'البحث المباشر في الويب عبر THOTH' : 'Live Web Search via THOTH'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 pt-0.5">
                      {searchSteps.map((step, idx) => {
                        const isCurrent = searchProgressStep === idx;
                        const isPassed = searchProgressStep > idx;
                        const StepIcon = step.icon;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2.5 text-xs py-1 px-2 rounded-lg transition-all ${
                              isCurrent
                                ? `${theme.badgeClass} font-bold border`
                                : isPassed
                                ? 'text-white/60 line-through opacity-70'
                                : 'text-white/30'
                            }`}
                          >
                            {isCurrent ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                            ) : isPassed ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <StepIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                            )}
                            <span>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : 

                /* 4.5 Learn Mode Animation */
                selectedMode === 'learn' ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                      <GraduationCap className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-300 animate-pulse">
                        {isAr ? 'THOTH بيجهز درسك وخطته التعليمية...' : 'THOTH is preparing your lesson & plan...'}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {isAr ? 'وضع التعلم — شرح وتفاعل ومهام' : 'Learn mode — teach, interact, tasks'}
                      </span>
                    </div>
                  </div>
                ) :

                /* 5. Fast Response Animation */
                (
                  <div className="flex items-center gap-3 py-1">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                      <Zap className={`w-4 h-4 ${theme.textAccent} animate-pulse`} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-semibold ${theme.textAccentBright} animate-pulse`}>
                        {isAr ? 'THOTH يقوم بالصياغة والرد السريع...' : 'THOTH is generating response...'}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {isAr ? 'معالجة فورية للطلب' : 'Instant processing'}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Bar */}
      <div className={`fixed ${isAuth ? 'bottom-[72px] sm:bottom-[76px]' : 'bottom-2 pb-2'} left-0 w-full z-40 bg-gradient-to-t from-[#0d0f17] via-[#0d0f17]/95 to-transparent pt-3 px-3 sm:px-6 pointer-events-none`}>
        <div className="w-full max-w-3xl mx-auto pointer-events-auto flex flex-col gap-2">
          
          {/* Integrated AI Mode Pills & New Chat */}
          <div className="flex items-center justify-between gap-2 pb-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedMode('fast')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  selectedMode === 'fast'
                    ? `${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} shadow-sm`
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <Zap className={`w-3 h-3 ${theme.textAccent}`} />
                <span>{isAr ? 'رد سريع' : 'Fast'}</span>
              </button>

              {isAuth && (
                <button
                  type="button"
                  onClick={() => setSelectedMode('thinking')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedMode === 'thinking'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>{isAr ? 'تفكير عميق' : 'Deep Thinking'}</span>
                </button>
              )}

              {isAuth && (
                <button
                  type="button"
                  onClick={() => setSelectedMode('web_search')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedMode === 'web_search'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <Globe className="w-3 h-3 text-blue-400" />
                  <span>{isAr ? 'بحث الويب' : 'Web Search'}</span>
                </button>
              )}

              {/* [LEARN MODE] Owner request: a dedicated learn pill next to web
                  search / deep thinking — with it ON, ANY message is handled as
                  a learning request automatically (topic -> full study plan
                  with tasks; content -> interactive lesson). No need to type
                  "اتعلم" or "لخص" anymore. Open to everyone; server counts it
                  as a normal chat call. */}
              <button
                type="button"
                onClick={() => setSelectedMode('learn')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  selectedMode === 'learn'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <GraduationCap className="w-3 h-3 text-emerald-400" />
                <span>{isAr ? 'تعلم' : 'Learn'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('image')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  selectedMode === 'image'
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-pink-400" />
                <span>{isAr ? 'إنشاء صورة' : 'Image Gen'}</span>
              </button>

              {isAuth && (
                <button
                  type="button"
                  onClick={() => setSelectedMode('audio_summary')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedMode === 'audio_summary'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>{isAr ? 'ملخص صوتي' : 'Audio Summary'}</span>
                </button>
              )}
            </div>
          </div>
          
          {isUploadingFile && (
            <div className="flex items-center gap-2.5 p-3 bg-[#1b1f32]/95 border border-indigo-500/40 rounded-2xl w-fit mb-2 animate-fade-in self-start pointer-events-auto shadow-xl backdrop-blur-md">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-indigo-200">
                  {uploadStatusText || (isAr ? 'جاري معالجة ورفع الوسائط...' : 'Processing and uploading media...')}
                </span>
                <span className="text-[10px] text-indigo-300/70">
                  {isAr ? 'يتم ضغط الوسائط لتقليل استهلاك المساحة وسرعة الرفع' : 'Media is compressed to minimize storage and speed up uploads'}
                </span>
              </div>
            </div>
          )}

          {attachedFile && !isUploadingFile && (
            <div className="flex items-center gap-3 p-2.5 bg-[#1b1f32]/95 border border-indigo-500/30 rounded-2xl w-fit mb-2 animate-fade-in self-start pointer-events-auto shadow-xl backdrop-blur-md">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center bg-white/5 shrink-0">
                {attachedFile.isVideo ? (
                  attachedFile.thumbnailUrl ? (
                    <img src={attachedFile.thumbnailUrl} alt="Video Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-6 h-6 text-purple-400" />
                  )
                ) : attachedFile.type.startsWith('image/') ? (
                  <img src={attachedFile.url} alt="Attachment" className="w-full h-full object-cover" />
                ) : attachedFile.type.startsWith('audio/') ? (
                  <Volume2 className="w-6 h-6 text-pink-400" />
                ) : (
                  <FileText className="w-6 h-6 text-indigo-400" />
                )}
                <button 
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-bl-lg p-0.5 transition-colors"
                  title={isAr ? "إزالة المرفق" : "Remove attachment"}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col min-w-0 pr-1 max-w-[240px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{attachedFile.name}</span>
                  {attachedFile.savingsPercentage && attachedFile.savingsPercentage > 0 ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                      {isAr ? `وفّر ${attachedFile.savingsPercentage}% ⚡` : `Saved ${attachedFile.savingsPercentage}% ⚡`}
                    </span>
                  ) : attachedFile.isUploadedToFileApi ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold shrink-0">
                      Cloud ⚡
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] text-white/60 truncate">
                  {attachedFile.isVideo ? (isAr ? '🎥 فيديو' : '🎥 Video') : attachedFile.type.startsWith('image/') ? (isAr ? '🖼️ صورة' : '🖼️ Image') : attachedFile.type.startsWith('audio/') ? (isAr ? '🎙️ صوت' : '🎙️ Audio') : (isAr ? '📄 مستند' : '📄 Document')} {attachedFile.sizeFormatted ? `• ${attachedFile.sizeFormatted}` : ''}
                </span>
              </div>
            </div>
          )}

          <div className={`relative flex items-end w-full bg-[#181b28]/90 backdrop-blur-2xl rounded-2xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] px-3 py-2.5 group transition-all ${isRecording ? 'border-red-500 shadow-red-500/20 animate-pulse' : `border-white/15 focus-within:${theme.borderAccent}`}`}>
            <button 
              type="button"
              onClick={handleOpenLiveModal}
              title={isAr ? "المحادثة الصوتية الحية (THOTH Live)" : "Live Voice Chat (THOTH Live)"}
              className={`p-2 transition-all rounded-xl ${theme.textAccent} ${theme.bgAccent} hover:scale-105 active:scale-95 flex items-center gap-1 font-bold shrink-0 mr-0.5 mb-0.5`}
            >
              <Radio className={`w-4 h-4 animate-pulse ${theme.textAccent}`} />
              <span className={`text-[11px] hidden sm:inline ${theme.textAccentBright} font-extrabold`}>THOTH Live</span>
            </button>

            <button 
              type="button"
              onClick={toggleMic}
              title={isRecording ? (isAr ? "إيقاف التسجيل" : "Stop recording") : (isAr ? "التحدث بصوتك" : "Speak with voice")}
              className={`p-2 transition-colors rounded-xl mb-0.5 ${isRecording ? 'text-red-400 bg-red-500/20 animate-bounce' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Unified Plus Action Button and Dropdown Menu */}
            <div className="relative shrink-0 flex items-center mb-0.5">
              <button 
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                title={isAr ? "إضافة وإنشاء (صورة، ملخص صوتي، إرفاق ملفات)" : "Add & Create (Image, Voice Summary, Attach Files)"}
                className={`p-2 transition-all rounded-xl cursor-pointer flex items-center justify-center ${
                  showPlusMenu 
                    ? 'bg-indigo-600/30 text-indigo-300 ring-2 ring-indigo-500/40' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {isUploadingFile ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <Plus className={`w-5 h-5 text-indigo-400 transition-transform duration-300 ${showPlusMenu ? 'rotate-45 text-indigo-200' : ''}`} />
                )}
              </button>

              {/* Floating Plus Action Menu */}
              {showPlusMenu && (
                <div 
                  ref={plusMenuRef}
                  className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-0 z-50 w-72 sm:w-80 bg-[#121624]/95 border border-indigo-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] p-2 backdrop-blur-2xl animate-fade-in space-y-1.5"
                >
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white/90 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {isAr ? 'أدوات وإنشاء THOTH' : 'THOTH Creation Tools'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowPlusMenu(false)}
                      className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Generate Image */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('image');
                      setShowPlusMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-all text-right group ${
                      selectedMode === 'image' ? 'bg-pink-500/15 border border-pink-500/30' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-pink-400 transition-all">
                      <ImageIcon className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                          {isAr ? 'إنشاء صورة ذكية' : 'AI Image Generator'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                          THOTH
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50 truncate">
                        {isAr ? 'توليد صور واقعية وفنية وتصميمات فورية' : 'Generate photorealistic and artistic images'}
                      </span>
                    </div>
                  </button>

                  {/* 2. Voice Summary & Podcast — REGISTERED USERS ONLY (owner rule:
                      guests must never see or reach the audio summary studio) */}
                  {isAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('audio_summary');
                      setShowPlusMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-all text-right group ${
                      selectedMode === 'audio_summary' ? 'bg-emerald-500/15 border border-emerald-500/30' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-emerald-400 transition-all">
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {isAr ? 'تلخيص صوتي وبودكاست' : 'Voice Summary & Podcast'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Studio
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50 truncate">
                        {isAr ? 'تحويل أي موضوع أو رابط إلى بودكاست مسموع' : 'Turn any topic or link into a spoken podcast'}
                      </span>
                    </div>
                  </button>
                  )}

                  {/* 3. Attach Files & Media */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-all text-right group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-blue-400 transition-all">
                      <Paperclip className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                          {isAr ? 'إرفاق ملفات ومستندات' : 'Attach Files & Media'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                          All Media
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50 truncate">
                        {isAr ? 'PDF، صور، فيديوهات، تسجيلات صوتية، كود' : 'PDFs, images, videos, audio, code files'}
                      </span>
                    </div>
                  </button>
                </div>
              )}

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*,video/*,audio/*,application/pdf,text/*,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.java,.go,.rs,.sh,.sql,.md" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                  e.target.value = '';
                }} 
                className="hidden" 
                disabled={isUploadingFile}
              />
            </div>

            <textarea 
              ref={textareaRef}
              rows={1}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 px-2 py-1 min-w-0 text-sm font-medium resize-none max-h-[180px] overflow-y-auto leading-relaxed custom-scrollbar" 
              placeholder={
                isRecording 
                  ? (isAr ? "تحدث الآن..." : "Listening...") 
                  : selectedMode === 'image'
                    ? (isAr ? "🎨 اكتب وصف الصورة التي تريد توليدها بدقة عالية..." : "🎨 Describe the image you want to generate...")
                    : selectedMode === 'audio_summary'
                      ? (isAr ? "🎙️ اكتب الموضوع أو الصق رابطاً لإنشاء بودكاست صوتي ذكي..." : "🎙️ Enter topic or paste link for a smart audio podcast...")
                      : selectedMode === 'fast' 
                        ? (isAr ? "اسأل THOTH أي شيء..." : "Ask THOTH anything...")
                        : selectedMode === 'thinking'
                          ? (isAr ? "🧠 اطرح مسألة معقدة للتفكير العميق المفصل..." : "🧠 Ask a complex question for deep reasoning...")
                          : selectedMode === 'learn'
                            ? (isAr ? "🎓 اكتب أي موضوع أو الصق درس... وTHOTH يشرحه ويعمل خطته من غير كلمة زيادة" : "🎓 Type a topic or paste a lesson... THOTH teaches & plans it instantly")
                            : (isAr ? "🌐 ابحث عن أي شيء في الويب..." : "🌐 Search anything across the web...")
              }  
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.previewGradient} ${theme.btnPrimary} hover:brightness-110 flex items-center justify-center shadow-lg transition-all shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Send className={`w-4 h-4 transform ${isAr ? 'rotate-180' : ''}`} />
            </button>

          </div>
        </div>
      </div>

      {/* RLHF Preference Comparison Modal (A/B Human Feedback) */}
      {preferenceCandidate && !preferenceCandidate.submitted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-2xl w-full text-right shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold text-white">
                  {isAr ? 'تقييم وتفضيل الإجابات (RLHF Human Preference)' : 'Response Evaluation & Preference (RLHF)'}
                </h3>
              </div>
              <button 
                onClick={() => setPreferenceCandidate(null)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/70">
              {isAr ? 'ساعدنا في تحسين نماذج THOTH باختيار الإجابة الأفضل بين النتيجتين:' : 'Help us improve THOTH models by choosing the best response between both:'}
            </p>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs text-indigo-200">
              <span className="font-bold block text-white/50 text-[10px] uppercase mb-1">
                {isAr ? 'السؤال / التعليمات:' : 'Prompt / Instructions:'}
              </span>
              {preferenceCandidate.prompt}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-300">{isAr ? 'الإجابة الأولى (A)' : 'First Response (A)'}</span>
                  <span className="text-[10px] text-white/40">{isAr ? 'الأصلية' : 'Original'}</span>
                </div>
                <p className="text-white/80 line-clamp-6 text-[11px] leading-relaxed">{preferenceCandidate.responseA}</p>
                <button
                  onClick={async () => {
                    await dataProgramService.submitPreference({
                      prompt: preferenceCandidate.prompt,
                      responseA: preferenceCandidate.responseA,
                      responseB: preferenceCandidate.responseB,
                      preferredResponse: 'A',
                      reason: selectedPrefReason
                    });
                    setPreferenceCandidate({ ...preferenceCandidate, submitted: true });
                  }}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
                >
                  {isAr ? 'تفضيل الإجابة A ⭐' : 'Prefer Response A ⭐'}
                </button>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-300">{isAr ? 'الإجابة الثانية (B)' : 'Second Response (B)'}</span>
                  <span className="text-[10px] text-white/40">{isAr ? 'المولدة حديثاً' : 'Newly Generated'}</span>
                </div>
                <p className="text-white/80 line-clamp-6 text-[11px] leading-relaxed">{preferenceCandidate.responseB}</p>
                <button
                  onClick={async () => {
                    await dataProgramService.submitPreference({
                      prompt: preferenceCandidate.prompt,
                      responseA: preferenceCandidate.responseA,
                      responseB: preferenceCandidate.responseB,
                      preferredResponse: 'B',
                      reason: selectedPrefReason
                    });
                    setPreferenceCandidate({ ...preferenceCandidate, submitted: true });
                  }}
                  className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all"
                >
                  {isAr ? 'تفضيل الإجابة B ⭐' : 'Prefer Response B ⭐'}
                </button>
              </div>
            </div>

            {/* Quick Reasons selector */}
            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] font-bold text-white/40 block mb-1.5">
                {isAr ? 'سبب التفضيل (اختياري):' : 'Reason for preference (optional):'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(isAr ? [
                  { label: 'أكثر دقة واكتمالاً', val: 'أكثر دقة واكتمالاً' },
                  { label: 'أسلوب لغوي أفضل', val: 'أسلوب لغوي أفضل' },
                  { label: 'كود برمجي صحيح', val: 'كود برمجي صحيح' },
                  { label: 'شرح أسرع وأوضح', val: 'شرح أسرع وأوضح' }
                ] : [
                  { label: 'More accurate & complete', val: 'More accurate & complete' },
                  { label: 'Better language tone', val: 'Better language tone' },
                  { label: 'Accurate code', val: 'Accurate code' },
                  { label: 'Clearer & faster explanation', val: 'Clearer & faster explanation' }
                ]).map((reasonObj) => (
                  <button
                    key={reasonObj.val}
                    onClick={() => setSelectedPrefReason(reasonObj.val)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${selectedPrefReason === reasonObj.val ? 'bg-purple-500/30 text-purple-200 border-purple-400' : 'bg-white/5 text-white/60 border-white/10'}`}
                  >
                    {reasonObj.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Feedback & Notes to Admin Modal */}
      {editingMsgData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-2xl w-full text-right shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {isAr ? 'إرسال ملاحظات وتعديلات للأدمن على الرد' : 'Send Feedback & Edit to Admin on Response'}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {isAr ? 'توجيه ملاحظاتك وانتقاداتك وتصحيحاتك المباشرة لإدارة النظام' : 'Direct your feedback, criticisms, and corrections to system administrators'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingMsgData(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingMsgData.isSentSuccess ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">
                  {isAr ? 'تم إرسال ملاحظاتك للأدمن بنجاح!' : 'Feedback sent to admin successfully!'}
                </h4>
                <p className="text-xs text-white/60 max-w-md">
                  {isAr 
                    ? 'شكرًا لمساهمتك القيمة. استُلمت ملاحظاتك وتعديلك وتم تحويلها إلى فريق الأدمن لتطوير استجابات نموذج THOTH.'
                    : 'Thank you for your valuable contribution. Your notes have been received and forwarded to the admin team to improve THOTH responses.'}
                </p>
              </div>
            ) : (
              <>
                {/* User Prompt Context */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-300 block">
                    {isAr ? 'السؤال الأصلي للمستخدم:' : 'Original user question:'}
                  </span>
                  <p className="text-xs text-white/80 line-clamp-2 leading-relaxed font-sans">{editingMsgData.prompt}</p>
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 block">
                    {isAr ? 'سبب الملاحظة / التصنيف:' : 'Feedback reason / Category:'}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(isAr ? [
                      'معلومات غير دقيقة ⚠️',
                      'خطأ برمجي 💻',
                      'إجابة غير مكتملة 📝',
                      'صياغة أو لغة ركيكة ✍️',
                      'تصحيح واقتراح تحسين 💡',
                      'ملاحظات عامة 💬'
                    ] : [
                      'Inaccurate info ⚠️',
                      'Code error 💻',
                      'Incomplete answer 📝',
                      'Poor phrasing ✍️',
                      'Improvement proposal 💡',
                      'General feedback 💬'
                    ]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditingMsgData({ ...editingMsgData, selectedCategory: cat })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          editingMsgData.selectedCategory === cat 
                            ? 'bg-indigo-600/40 text-indigo-200 border-indigo-400 shadow-lg shadow-indigo-500/20' 
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Note Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 block">
                    {isAr ? 'ملاحظاتك وانتقادك المباشر للأدمن:' : 'Your direct feedback for the admin:'}
                  </label>
                  <textarea
                    value={editingMsgData.userNote || ''}
                    onChange={(e) => setEditingMsgData({ ...editingMsgData, userNote: e.target.value })}
                    rows={3}
                    placeholder={isAr ? "اكتب ملاحظتك للأدمن هنا (مثال: الرد يحتوي معلومة قديمة في الفقرة الثانية، أو التنسيق غير واضح...)" : "Write your note to the admin here (e.g., outdated info, unclear formatting...)"}
                    className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 leading-relaxed font-sans"
                  />
                </div>

                {/* Response Edit Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 block flex items-center justify-between">
                    <span>{isAr ? 'تعديل أو تصحيح نص الرد (اختياري):' : 'Edit / Correct response text (optional):'}</span>
                    <span className="text-[10px] text-white/40 font-normal">
                      {isAr ? 'يمكنك كتابة الرد المثالي بيدك' : 'You can provide the ideal response'}
                    </span>
                  </label>
                  <textarea
                    value={editingMsgData.currentText}
                    onChange={(e) => setEditingMsgData({ ...editingMsgData, currentText: e.target.value })}
                    rows={5}
                    placeholder={isAr ? "قم بتعديل نص الرد..." : "Edit the response text..."}
                    className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 leading-relaxed font-mono"
                  />
                </div>

                {/* Local Update Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="updateLocalMsg"
                    checked={editingMsgData.updateLocalMsg ?? true}
                    onChange={(e) => setEditingMsgData({ ...editingMsgData, updateLocalMsg: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600 bg-slate-950 border-white/20 cursor-pointer"
                  />
                  <label htmlFor="updateLocalMsg" className="text-xs text-white/70 cursor-pointer select-none">
                    {isAr ? 'تحديث الرد في هذه المحادثة أيضاً بعد الإرسال' : 'Update the response in this chat session after sending'}
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingMsgData(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editingMsgData.isSending}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {editingMsgData.isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isAr ? 'جاري إرسال الملاحظات...' : 'Sending feedback...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isAr ? 'إرسال الملاحظات والتعديل للأدمن' : 'Submit Feedback & Edit'}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Fullscreen Image Preview Modal */}
      {previewImageModalUrl && (
        <div 
          onClick={() => setPreviewImageModalUrl(null)}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(previewImageModalUrl);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `thoth_hd_image_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  window.open(previewImageModalUrl, '_blank');
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl border border-indigo-400/30 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تحميل الصورة بدقة عالية' : 'Download High-Res Image'}</span>
            </button>
            <button
              onClick={() => setPreviewImageModalUrl(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 cursor-pointer"
              title={isAr ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-3xl border border-white/15 shadow-2xl bg-black/60"
          >
            <img 
              src={previewImageModalUrl} 
              alt="Full Preview" 
              className="max-w-full max-h-[82vh] object-contain rounded-2xl"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('/api/image-proxy')) {
                  target.src = `/api/image-proxy?url=${encodeURIComponent(previewImageModalUrl)}`;
                }
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

