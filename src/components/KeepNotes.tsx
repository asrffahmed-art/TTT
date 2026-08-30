import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect } from 'react';
import { 
  Plus, Pin, Trash2, Search, CheckSquare, Square, Tag, RefreshCw, Sparkles, 
  Check, Bookmark, Calendar, Image as ImageIcon, Edit3, X, Copy, Download, 
  List, CheckCircle, FileText, Trash, ChevronDown, Sparkle, ArrowRight,
  Mic, Paintbrush, Type, Undo2, Redo2, MoreVertical, Play, Pause, Bell, Archive, Maximize2
} from 'lucide-react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, cleanObject } from '../lib/firebase';
import { getEffectiveUserId, isUserAuthenticated } from '../lib/chatSessionManager';
import { useAppTheme } from '../lib/themeService';

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  tags: string[];
  imageUrl?: string;
  audioUrl?: string;
  items?: { id: string; text: string; completed: boolean }[];
  updatedAt: string;
}

function getDeletedNotesKey(userId: string | null): string {
  return userId ? `app-deleted-notes-${userId}` : 'app-deleted-notes-guest';
}

function getDeletedNotesSet(userId: string | null): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(getDeletedNotesKey(userId));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function markNoteDeletedLocally(userId: string | null, noteId: string): void {
  if (!userId || !noteId) return;
  try {
    const set = getDeletedNotesSet(userId);
    set.add(noteId);
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(getDeletedNotesKey(userId), JSON.stringify(arr));
  } catch (e) {}
}

function unmarkNoteDeleted(userId: string | null, noteId: string): void {
  if (!userId || !noteId) return;
  try {
    const set = getDeletedNotesSet(userId);
    if (set.has(noteId)) {
      set.delete(noteId);
      localStorage.setItem(getDeletedNotesKey(userId), JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

export function processNoteContent(content: string | undefined, existingImageUrl?: string) {
  if (!content) return { text: '', imageUrl: existingImageUrl || null };

  let imageUrl = existingImageUrl || null;

  // 1. Try to extract markdown image URL if no existingImageUrl
  if (!imageUrl) {
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
    if (mdMatch) {
      imageUrl = mdMatch[1];
    }
  }

  // 2. Try to extract pollinations or direct image URL if still no imageUrl
  if (!imageUrl) {
    const pollMatch = content.match(/(https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+)/i);
    if (pollMatch) {
      imageUrl = pollMatch[1];
    } else {
      const imgUrlMatch = content.match(/(https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif))/i);
      if (imgUrlMatch) {
        imageUrl = imgUrlMatch[1];
      }
    }
  }

  // Clean the text from image markdown and raw image URLs
  let text = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+/gi, '')
    .replace(/https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif)/gi, '')
    .replace(/\*\(Prompt:.*?\)\*/gi, '')
    .replace(/\[Prompt:.*?\]/gi, '')
    .trim();

  return { text, imageUrl };
}

const COLOR_OPTIONS = [
  { name: 'زجاج شفاف', bg: 'bg-white/[0.04] backdrop-blur-2xl border-white/[0.12]' },
  { name: 'أحمر قرمزي', bg: 'bg-red-500/15 backdrop-blur-2xl border-red-500/35' },
  { name: 'أزرق ملكي', bg: 'bg-blue-500/15 backdrop-blur-2xl border-blue-500/35' },
  { name: 'أخضر زمردي', bg: 'bg-emerald-500/15 backdrop-blur-2xl border-emerald-500/35' },
  { name: 'برتقالي ذهبي', bg: 'bg-amber-500/15 backdrop-blur-2xl border-amber-500/35' },
  { name: 'أرجواني ملكي', bg: 'bg-purple-500/15 backdrop-blur-2xl border-purple-500/35' },
  { name: 'وردي أنيق', bg: 'bg-pink-500/15 backdrop-blur-2xl border-pink-500/35' },
];

export interface KeepNotesProps {
  onAction?: (msg: string | { text: string; image?: string; audio?: string; items?: any[]; noteId?: string }) => void;
  onModalToggle?: (isOpen: boolean) => void;
}

export function KeepNotes({ onAction, onModalToggle }: KeepNotesProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const theme = useAppTheme();
  const [notes, setNotes] = useState<KeepNote[]>(() => {
    const userId = getEffectiveUserId();
    if (!userId) return [];
    const saved = localStorage.getItem(`app-keep-notes-${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deletedSet = getDeletedNotesSet(userId);
          return parsed.filter(n => n && n.id && !deletedSet.has(n.id));
        }
      } catch (e) { return []; }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].bg);
  const [selectedTag, setSelectedTag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [todoItems, setTodoItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedStatus, setSyncedStatus] = useState<string | null>(null);

  // Voice note and extra tools state
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Undo/Redo tracking for Create Note
  const [createHistory, setCreateHistory] = useState<{ title: string; content: string }[]>([]);
  const [createHistoryIndex, setCreateHistoryIndex] = useState(-1);

  // Undo/Redo tracking for Edit Note
  const [editHistory, setEditHistory] = useState<{ title: string; content: string }[]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState(-1);
  
  // Confirmation modal state for deleting note
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editTagInput, setEditTagInput] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editTodoInput, setEditTodoInput] = useState('');
  const [editTodoItems, setEditTodoItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);

  useEffect(() => {
    const userId = getEffectiveUserId();
    if (userId) {
      localStorage.setItem(`app-keep-notes-${userId}`, JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    const handleUpdateNoteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; content?: string; title?: string; items?: any[] }>;
      if (!customEvent.detail) return;
      const { id, content, title, items } = customEvent.detail;
      const userId = getEffectiveUserId();
      
      // Update editing modal fields if this is the note currently being edited
      if (editingNote && editingNote.id === id) {
        if (content !== undefined) setEditContent(content);
        if (title !== undefined) setEditTitle(title);
        if (items !== undefined) setEditTodoItems(items);
      }

      setNotes(prevNotes => {
        const updated = prevNotes.map(n => {
          if (n.id === id) {
            const rawContent = content !== undefined ? content : n.content;
            const { text: cleanContent, imageUrl: extractedImage } = processNoteContent(rawContent, n.imageUrl);
            const updatedNote = {
              ...n,
              content: cleanContent,
              imageUrl: extractedImage || n.imageUrl,
              title: title !== undefined ? title : n.title,
              items: items !== undefined ? items : n.items,
              updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            };
            
            // If logged in, sync to Firestore
            if (userId) {
              unmarkNoteDeleted(userId, id);
              setDoc(doc(db, 'users', userId, 'notes', id), cleanObject(updatedNote))
                .catch(err => console.error('Error syncing note to firestore:', err));
            }
            return updatedNote;
          }
          return n;
        });
        return updated;
      });
    };

    const handleCreateNoteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; content: string; color?: string; tags?: string[]; items?: any[]; imageUrl?: string; audioUrl?: string }>;
      if (!customEvent.detail) return;
      const { title, content, color, tags, items, imageUrl, audioUrl } = customEvent.detail;
      const { text: cleanContent, imageUrl: extractedImage } = processNoteContent(content, imageUrl);
      const userId = getEffectiveUserId();
      const newNoteId = `note_${Date.now()}`;
      const newNote: KeepNote = {
        id: newNoteId,
        title: title || 'ملخص جديد 📝',
        content: cleanContent || '',
        color: color || COLOR_OPTIONS[0].bg,
        isPinned: false,
        tags: tags || ['تلخيص_AI'],
        items: items,
        imageUrl: extractedImage || undefined,
        audioUrl,
        updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      
      setNotes(prevNotes => {
        const updated = [newNote, ...prevNotes];
        if (userId) {
          unmarkNoteDeleted(userId, newNoteId);
          setDoc(doc(db, 'users', userId, 'notes', newNoteId), cleanObject(newNote))
            .catch(err => console.error('Error syncing new note to firestore:', err));
        }
        return updated;
      });
    };

    window.addEventListener('update-keep-note', handleUpdateNoteEvent);
    window.addEventListener('create-keep-note', handleCreateNoteEvent);
    return () => {
      window.removeEventListener('update-keep-note', handleUpdateNoteEvent);
      window.removeEventListener('create-keep-note', handleCreateNoteEvent);
    };
  }, [notes, editingNote]);

  useEffect(() => {
    if (onModalToggle) {
      onModalToggle(isCreating || editingNote !== null);
    }
  }, [isCreating, editingNote, onModalToggle]);

  useEffect(() => {
    const loadUserNotes = async (targetUid: string | null) => {
      if (!targetUid) {
        setNotes([]);
        return;
      }
      
      const deletedSet = getDeletedNotesSet(targetUid);
      const saved = localStorage.getItem(`app-keep-notes-${targetUid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setNotes(parsed.filter(n => n && n.id && !deletedSet.has(n.id)));
          }
        } catch (e) {}
      }
      
      setIsSyncing(true);
      try {
        const snap = await getDocs(collection(db, 'users', targetUid, 'notes'));
        if (!snap.empty) {
          const fetched: KeepNote[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() as KeepNote;
            if (data && data.id && !deletedSet.has(data.id)) {
              fetched.push(data);
            }
          });
          
          fetched.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.id || '').localeCompare(a.id || '');
          });

          setNotes(fetched);
          localStorage.setItem(`app-keep-notes-${targetUid}`, JSON.stringify(fetched));
        }
      } catch (err) {
        console.error('Fetch notes error:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = user ? user.uid : getEffectiveUserId();
      loadUserNotes(uid);
    });

    const handleSessionsUpdate = (e: any) => {
      if (e?.detail?.sessions?.length === 0 && !getEffectiveUserId()) {
        setNotes([]);
      }
    };
    window.addEventListener('thoth_sessions_list_updated', handleSessionsUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('thoth_sessions_list_updated', handleSessionsUpdate);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("حجم الصورة كبير جداً! يرجى اختيار صورة أصغر من 2 ميجابايت لضمان سرعة التحميل والسحابة.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isEdit) {
            setEditImageUrl(reader.result);
          } else {
            setImageUrl(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTodoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) return;
    setTodoItems([...todoItems, { id: `todo_${Date.now()}`, text: todoInput.trim(), completed: false }]);
    setTodoInput('');
  };

  const handleRemoveTodoItem = (id: string) => {
    setTodoItems(todoItems.filter(item => item.id !== id));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            if (editingNote) {
              setEditAudioUrl(reader.result);
            } else {
              setAudioUrl(reader.result);
            }
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setShowPlusMenu(false);
    } catch (err: any) {
      console.warn("Microphone permission notice in KeepNotes:", err?.name || err?.message || err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() && !newContent.trim() && todoItems.length === 0 && !imageUrl && !audioUrl) return;

    const userId = getEffectiveUserId();
    const parsedTags = selectedTag.trim() 
      ? selectedTag.trim().split(/[\s，,]+/).filter(Boolean)
      : ['عام'];

    const { text: cleanContent, imageUrl: extractedImage } = processNoteContent(newContent, imageUrl);

    const newNoteId = `note_${Date.now()}`;
    const newNote: KeepNote = {
      id: newNoteId,
      title: newTitle.trim() || 'ملاحظة جديدة',
      content: cleanContent,
      color: selectedColor,
      isPinned: newIsPinned,
      tags: parsedTags,
      imageUrl: extractedImage || undefined,
      audioUrl: audioUrl.trim() || undefined,
      items: todoItems.length > 0 ? todoItems : undefined,
      updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    setNewTitle('');
    setNewContent('');
    setSelectedTag('');
    setImageUrl('');
    setAudioUrl('');
    setTodoItems([]);
    setNewIsPinned(false);
    setSelectedColor(COLOR_OPTIONS[0].bg);
    setIsCreating(false);

    // Sync to Firestore
    if (userId) {
      unmarkNoteDeleted(userId, newNoteId);
      try {
        await setDoc(doc(db, 'users', userId, 'notes', newNote.id), cleanObject(newNote));
      } catch (err) {
        console.error('Error saving note:', err);
      }
    }
  };

  // Toggle checklist item completion directly from card
  const handleToggleTodoCard = async (noteId: string, itemId: string) => {
    const updated = notes.map(n => {
      if (n.id === noteId && n.items) {
        return {
          ...n,
          items: n.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
        };
      }
      return n;
    });
    setNotes(updated);

    const userId = getEffectiveUserId();
    const item = updated.find(n => n.id === noteId);
    if (userId && item) {
      try {
        await setDoc(doc(db, 'users', userId, 'notes', noteId), cleanObject(item), { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTogglePin = async (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
    setNotes(updated);
    const userId = getEffectiveUserId();
    const item = updated.find(n => n.id === id);
    if (userId && item) {
      try {
        await setDoc(doc(db, 'users', userId, 'notes', id), cleanObject(item), { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    const userId = getEffectiveUserId();
    
    // 1. Optimistic UI update
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNote?.id === id) {
      setEditingNote(null);
    }

    if (!userId) return;

    // 2. Mark in local tombstones
    markNoteDeletedLocally(userId, id);

    // 3. Update localStorage cache
    try {
      const saved = localStorage.getItem(`app-keep-notes-${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((n: any) => n && n.id !== id);
          localStorage.setItem(`app-keep-notes-${userId}`, JSON.stringify(updated));
        }
      }
    } catch (e) {}

    // 4. Delete directly from Firestore
    try {
      await deleteDoc(doc(db, 'users', userId, 'notes', id));
    } catch (e) {
      console.error('Error deleting note from Firestore:', e);
    }
  };

  // Open edit modal & prepare fields
  const handleOpenEditModal = (note: KeepNote) => {
    const { text, imageUrl } = processNoteContent(note.content, note.imageUrl);
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(text);
    setEditColor(note.color);
    setEditIsPinned(note.isPinned);
    setEditTags(note.tags || []);
    setEditImageUrl(imageUrl || '');
    setEditAudioUrl(note.audioUrl || '');
    setEditTodoItems(note.items || []);
    setEditTodoInput('');
    setEditTagInput('');

    // Initialize histories
    setEditHistory([{ title: note.title, content: text }]);
    setEditHistoryIndex(0);
  };

  const handleAddEditTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTodoInput.trim()) return;
    setEditTodoItems([...editTodoItems, { id: `todo_${Date.now()}`, text: editTodoInput.trim(), completed: false }]);
    setEditTodoInput('');
  };

  const handleSaveEditNote = async () => {
    if (!editingNote) return;

    const { text: cleanContent, imageUrl: extractedImage } = processNoteContent(editContent, editImageUrl);

    const updatedNote: KeepNote = {
      ...editingNote,
      title: editTitle.trim() || (isAr ? 'ملاحظة محدثة' : 'Updated Note'),
      content: cleanContent,
      color: editColor,
      isPinned: editIsPinned,
      tags: editTags.length > 0 ? editTags : [isAr ? 'عام' : 'General'],
      imageUrl: extractedImage || undefined,
      audioUrl: editAudioUrl.trim() || undefined,
      items: editTodoItems.length > 0 ? editTodoItems : undefined,
      updatedAt: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updated = notes.map(n => n.id === editingNote.id ? updatedNote : n);
    setNotes(updated);
    setEditingNote(null);
    setEditAudioUrl('');

    // Sync to Firestore
    const userId = getEffectiveUserId();
    if (userId) {
      unmarkNoteDeleted(userId, editingNote.id);
      try {
        await setDoc(doc(db, 'users', userId, 'notes', editingNote.id), cleanObject(updatedNote));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGoogleTasksSync = async () => {
    const userId = getEffectiveUserId();
    if (!userId) {
      setSyncedStatus(language === 'ar' ? 'يرجى تسجيل الدخول لمزامنة الملاحظات سحابياً!' : 'Please log in to sync notes!');
      setTimeout(() => setSyncedStatus(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncedStatus(language === 'ar' ? 'جاري مزامنة الملاحظات مع السحابة...' : 'Syncing notes with cloud...');
    
    try {
      const deletedSet = getDeletedNotesSet(userId);
      const snap = await getDocs(collection(db, 'users', userId, 'notes'));
      const cloudMap = new Map<string, KeepNote>();
      snap.forEach(docSnap => {
        const data = docSnap.data() as KeepNote;
        if (data && data.id && !deletedSet.has(data.id)) {
          cloudMap.set(data.id, data);
        }
      });

      // Upload any local only non-deleted notes
      for (const note of notes) {
        if (note && note.id && !deletedSet.has(note.id) && !cloudMap.has(note.id)) {
          await setDoc(doc(db, 'users', userId, 'notes', note.id), cleanObject(note));
        }
      }

      // Re-fetch clean list
      const freshSnap = await getDocs(collection(db, 'users', userId, 'notes'));
      const fetched: KeepNote[] = [];
      freshSnap.forEach(docSnap => {
        const data = docSnap.data() as KeepNote;
        if (data && data.id && !deletedSet.has(data.id)) {
          fetched.push(data);
        }
      });

      fetched.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.id || '').localeCompare(a.id || '');
      });

      setNotes(fetched);
      localStorage.setItem(`app-keep-notes-${userId}`, JSON.stringify(fetched));
      setSyncedStatus(language === 'ar' ? 'تمت المزامنة بنجاح وحفظ أفكارك بأمان!' : 'Notes successfully synced!');
    } catch (err) {
      console.error("Sync error:", err);
      setSyncedStatus(language === 'ar' ? 'حدث خطأ أثناء مزامنة السحابة.' : 'Cloud sync error.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncedStatus(null), 3500);
    }
  };

  const isAuth = isUserAuthenticated();

  if (!isAuth) {
    return (
      <div className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl my-auto">
          <div className={`w-20 h-20 rounded-3xl ${theme.bgAccent} ${theme.textAccent} flex items-center justify-center mb-6 shadow-xl border ${theme.borderAccent}`}>
            <Bookmark className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {language === 'ar' ? 'الملاحظات مخصصة للحسابات المسجلة' : 'Keep Notes is for Registered Accounts'}
          </h2>
          <p className="text-sm text-white/60 max-w-md mb-8 leading-relaxed">
            {language === 'ar' 
              ? 'لحماية خصوصيتك ولضمان مزامنة وحفظ ملاحظاتك وقوائمك بأمان على السحابة، يرجى تسجيل الدخول للوصول إلى ملاحظاتك في أي وقت.'
              : 'To protect your privacy and securely sync your notes and checklists across devices, please log in to access your notes anytime.'}
          </p>
        </div>
      </div>
    );
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const otherNotes = filteredNotes.filter(n => !n.isPinned);

  return (
    <div 
      className="flex flex-col w-full h-full pb-36 pt-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar relative"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      
      {/* Top Action Bar matching Chat.tsx */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.05] backdrop-blur-2xl text-gray-200 text-xs font-bold border border-white/[0.12] shadow-sm">
            <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isAr ? 'مفكرة الملاحظات' : 'Notes Pad'}</span>
            <span className="text-[10px] text-gray-400 font-normal">({notes.length})</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] text-[11px] font-medium text-gray-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="font-bold text-gray-200">Keep Sync</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            onClick={handleGoogleTasksSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-2xl text-gray-300 hover:text-white text-xs font-bold transition-all border border-white/[0.12] active:scale-95 shadow-sm cursor-pointer"
            title={isAr ? 'مزامنة السحاب' : 'Cloud Sync'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isAr ? 'مزامنة السحاب' : 'Cloud Sync'}</span>
          </button>

          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-pink-500 hover:brightness-110 text-white text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>{isAr ? 'ملاحظة جديدة' : 'New Note'}</span>
          </button>
        </div>
      </div>

      {syncedStatus && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-2xl flex items-center justify-between backdrop-blur-2xl animate-fade-in shadow-sm">
          <span>{syncedStatus}</span>
          <CheckCircle className="w-4 h-4 text-amber-400" />
        </div>
      )}

      {/* New Note Form / Button */}
      {!isCreating ? (
        <div className="w-full mb-4 flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.12] rounded-2xl p-2.5 px-4 shadow-sm backdrop-blur-2xl transition-all group">
          <button 
            onClick={() => setIsCreating(true)}
            className={`flex-1 ${isAr ? 'text-right' : 'text-left'} text-xs sm:text-sm text-gray-400 hover:text-gray-200 font-medium py-1.5 outline-none border-none cursor-pointer`}
          >
            {isAr ? 'اكتب ملاحظة سريعة أو أضف قائمة...' : 'Take a quick note or add a checklist...'}
          </button>
          <div className={`flex items-center gap-1.5 ${isAr ? 'border-r pr-2 mr-2' : 'border-l pl-2 ml-2'} border-white/10`}>
            <button 
              onClick={() => {
                setIsCreating(true);
                setTodoItems([{ id: `todo_${Date.now()}`, text: '', completed: false }]);
              }}
              className="p-1.5 rounded-xl text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-all cursor-pointer"
              title={isAr ? 'قائمة مهام جديدة' : 'New checklist'}
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <label className="p-1.5 rounded-xl text-gray-400 hover:text-amber-400 hover:bg-white/5 cursor-pointer transition-all flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  handleImageUpload(e, false);
                  setIsCreating(true);
                }} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Main Modal Box */}
          <div className={`w-full h-full sm:h-[85vh] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl border-none sm:border border-white/10 ${selectedColor} shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden transition-all duration-300 relative`}>
            
            {/* Embedded Dark Tint */}
            <div className="absolute inset-0 bg-[#0f1422]/65 -z-10" />

            {/* Top Navigation/Action Bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-black/10">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    handleAddNote();
                    setIsCreating(false);
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title={isAr ? 'حفظ وإغلاق' : 'Save & close'}
                >
                  <ArrowRight className={`w-5 h-5 ${isAr ? '' : 'rotate-180'}`} />
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    let finalTitle = newTitle.trim() || (isAr ? 'ملاحظة جديدة' : 'New Note');
                    let finalContent = newContent.trim();
                    let promptText = isAr 
                      ? `قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\nالعنوان: ${finalTitle}\nالمحتوى: ${finalContent}`
                      : `Please improve and refine the phrasing and formatting of this note:\nTitle: ${finalTitle}\nContent: ${finalContent}`;
                    if (todoItems && todoItems.length > 0) {
                      promptText += (isAr ? `\n\nقائمة المهام المرتبطة:\n` : `\n\nLinked checklist:\n`) + todoItems.map(item => `${item.completed ? '[✓]' : '[ ]'} ${item.text}`).join('\n');
                    }
                    
                    const newNoteId = `note_${Date.now()}`;
                    const newNote = {
                      id: newNoteId,
                      title: finalTitle,
                      content: finalContent,
                      color: selectedColor,
                      isPinned: newIsPinned,
                      tags: selectedTag.trim() ? selectedTag.trim().split(/[\s，,]+/).filter(Boolean) : [isAr ? 'عام' : 'General'],
                      imageUrl: imageUrl.trim() || undefined,
                      audioUrl: audioUrl.trim() || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined,
                      updatedAt: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    
                    setNotes(prev => [newNote, ...prev]);
                    setIsCreating(false);
                    setNewTitle('');
                    setNewContent('');
                    setSelectedTag('');
                    setImageUrl('');
                    setAudioUrl('');
                    setTodoItems([]);
                    setNewIsPinned(false);
                    setSelectedColor(COLOR_OPTIONS[0].bg);

                    // Sync to Firestore
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', newNote.id), cleanObject(newNote));
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    onAction?.({
                      text: promptText,
                      image: imageUrl || undefined,
                      audio: audioUrl || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined,
                      noteId: newNoteId
                    });
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center"
                  title={isAr ? 'مساعد الذكاء الاصطناعي لتحسين النص' : 'AI Assistant to refine note'}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Pin Button */}
                <button 
                  type="button"
                  onClick={() => setNewIsPinned(!newIsPinned)}
                  className={`p-2.5 rounded-2xl transition-all ${newIsPinned ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'}`}
                  title={newIsPinned ? (isAr ? "إلغاء التثبيت" : "Unpin") : (isAr ? "تثبيت الملاحظة" : "Pin note")}
                >
                  <Pin className={`w-4.5 h-4.5 ${newIsPinned ? 'fill-amber-400 rotate-45' : ''}`} />
                </button>

                {/* Simulated Reminder Bell */}
                <button 
                  type="button"
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                  title={isAr ? "إضافة تذكير" : "Add reminder"}
                >
                  <Bell className="w-4.5 h-4.5" />
                </button>

                {/* Cancel/Discard Button */}
                <button 
                  type="button"
                  onClick={() => {
                    setNewTitle('');
                    setNewContent('');
                    setImageUrl('');
                    setAudioUrl('');
                    setTodoItems([]);
                    setIsCreating(false);
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-red-400 transition-all"
                  title={isAr ? "تجاهل وحذف" : "Discard note"}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-24">
              
              {/* Image Preview */}
              {imageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[16/9] sm:aspect-[21/9] shadow-lg group">
                  <img src={imageUrl} alt="Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-3 left-3 p-2 rounded-full bg-black/80 hover:bg-black text-white transition-all shadow-md"
                    title={isAr ? "حذف الصورة" : "Delete image"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Recorded Audio Player */}
              {audioUrl && (
                <div className="p-1 bg-black/15 rounded-2xl border border-white/5">
                  <VoicePlayer audioUrl={audioUrl} onDelete={() => setAudioUrl('')} />
                </div>
              )}

              {/* Title Input */}
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  const nextHistory = createHistory.slice(0, createHistoryIndex + 1);
                  setCreateHistory([...nextHistory, { title: e.target.value, content: newContent }]);
                  setCreateHistoryIndex(nextHistory.length);
                }}
                className="w-full bg-transparent text-white font-extrabold text-xl sm:text-2xl outline-none placeholder:text-white/20 border-none focus:ring-0 p-0"
                placeholder={isAr ? "العنوان" : "Title"}
              />

              {/* Content Textarea */}
              <textarea 
                value={newContent}
                onChange={(e) => {
                  setNewContent(e.target.value);
                  const nextHistory = createHistory.slice(0, createHistoryIndex + 1);
                  setCreateHistory([...nextHistory, { title: newTitle, content: e.target.value }]);
                  setCreateHistoryIndex(nextHistory.length);
                }}
                rows={10}
                className="w-full bg-transparent text-white text-base sm:text-lg leading-relaxed outline-none placeholder:text-white/20 border-none focus:ring-0 p-0 resize-none min-h-[220px]"
                placeholder={isAr ? "اكتب ملاحظة هنا..." : "Take a note here..."}
              />

              {/* Checklist Editor Section */}
              {todoItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    {isAr ? 'قائمة المهام:' : 'Checklist:'}
                  </span>
                  
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {todoItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 group/todo bg-white/5 p-2 rounded-xl border border-white/5">
                        <button 
                          type="button" 
                          onClick={() => setTodoItems(todoItems.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t))}
                          className="text-white/30 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                        >
                          {item.completed ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                        </button>
                        <input 
                          type="text"
                          value={item.text}
                          onChange={(e) => setTodoItems(todoItems.map(t => t.id === item.id ? { ...t, text: e.target.value } : t))}
                          placeholder={isAr ? "اكتب عنصراً..." : "Write item..."}
                          className={`flex-1 bg-transparent text-xs sm:text-sm outline-none border-none p-0 focus:ring-0 ${item.completed ? 'line-through text-white/40 font-light' : 'text-white font-medium'}`}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTodoItem(item.id)}
                          className="text-white/30 hover:text-red-400 p-1.5 transition-all cursor-pointer"
                          title={isAr ? "إزالة" : "Remove"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline list adder */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!todoInput.trim()) return;
                    setTodoItems([...todoItems, { id: `todo_${Date.now()}`, text: todoInput.trim(), completed: false }]);
                    setTodoInput('');
                  }} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={isAr ? "إضافة عنصر مهام آخر..." : "Add another checklist item..."}
                      value={todoInput}
                      onChange={(e) => setTodoInput(e.target.value)}
                      className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-xl border border-white/10 outline-none focus:border-amber-500/50 placeholder:text-white/30"
                    />
                    <button 
                      type="submit" 
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 cursor-pointer shrink-0"
                    >
                      {isAr ? 'إضافة عنصر' : 'Add Item'}
                    </button>
                  </form>
                </div>
              )}

              {/* Dynamic Tag Pill list */}
              {selectedTag && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    {isAr ? 'الوسم المختار:' : 'Selected Tag:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 text-[11px] px-3 py-1 rounded-full font-bold border border-amber-500/15">
                      #{selectedTag}
                      <button 
                        type="button" 
                        onClick={() => setSelectedTag('')}
                        className="hover:text-red-400 text-white/40 text-xs ml-1 cursor-pointer font-extrabold"
                        title={isAr ? "حذف الوسم" : "Remove tag"}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom sticky palette selector */}
            {showColorPicker && (
              <div className="absolute bottom-16 left-4 right-4 z-[130] bg-[#141a2a]/95 border border-white/10 rounded-2xl p-3 flex items-center justify-around gap-1.5 shadow-2xl animate-scale-up animate-fade-in">
                {COLOR_OPTIONS.map((c, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => {
                      setSelectedColor(c.bg);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-full border border-white/20 transition-all ${c.bg} hover:scale-125 active:scale-95 cursor-pointer ${selectedColor === c.bg ? 'ring-2 ring-amber-400 scale-110' : ''}`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Bottom Sticky Action/Toolbar Bar (Keep-Style) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-white/5 bg-[#0e121f]/95 flex items-center justify-between px-5 z-[120] shrink-0">
              {/* Right/Left: Plus, Palette, Image, Mic, Text helper */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button 
                  type="button"
                  onClick={() => {
                    setTodoItems([...todoItems, { id: `todo_${Date.now()}`, text: '', completed: false }]);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "إضافة عنصر قائمة مهام" : "Add checklist item"}
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "تغيير اللون الخلفي" : "Change note color"}
                >
                  <Paintbrush className="w-4.5 h-4.5" />
                </button>
                {/* Image Upload Button */}
                <label className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                  <ImageIcon className="w-4.5 h-4.5" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, false)} 
                    className="hidden" 
                  />
                </label>
                {/* Voice Note Recording Button */}
                <button 
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${recording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'}`}
                  title={recording ? (isAr ? "إيقاف التسجيل وحفظ" : "Stop & save") : (isAr ? "تسجيل ملاحظة صوتية" : "Record voice note")}
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>

              </div>

              {/* Undo, Redo, Tag, and Save */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button 
                  type="button"
                  disabled={createHistoryIndex <= 0}
                  onClick={() => {
                    if (createHistoryIndex > 0) {
                      const idx = createHistoryIndex - 1;
                      setCreateHistoryIndex(idx);
                      const state = createHistory[idx];
                      setNewTitle(state.title);
                      setNewContent(state.content);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all ${createHistoryIndex > 0 ? 'bg-white/5 text-white/80 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                  title={isAr ? "تراجع" : "Undo"}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  disabled={createHistoryIndex >= createHistory.length - 1}
                  onClick={() => {
                    if (createHistoryIndex < createHistory.length - 1) {
                      const idx = createHistoryIndex + 1;
                      setCreateHistoryIndex(idx);
                      const state = createHistory[idx];
                      setNewTitle(state.title);
                      setNewContent(state.content);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all ${createHistoryIndex < createHistory.length - 1 ? 'bg-white/5 text-white/80 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                  title={isAr ? "إعادة" : "Redo"}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                
                {/* Tag trigger popup */}
                <button 
                  type="button"
                  onClick={() => {
                    const tag = prompt(isAr ? "أدخل وسماً للملاحظة:" : "Enter a tag for the note:");
                    if (tag && tag.trim()) {
                      setSelectedTag(tag.trim());
                    }
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "إضافة وسم جديد" : "Add tag"}
                >
                  <Tag className="w-4 h-4" />
                </button>

                {/* Save and Exit */}
                <button
                  type="button"
                  onClick={() => {
                    handleAddNote();
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                >
                  {isAr ? 'تم' : 'Done'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Search Input styled like Chat.tsx */}
      <div className="relative mb-4">
        <div className="relative flex items-center bg-white/[0.04] backdrop-blur-2xl border border-white/10 focus-within:border-amber-500/50 rounded-2xl transition-all shadow-sm">
          <Search className={`w-4 h-4 text-gray-400 ${isAr ? 'ml-3' : 'mr-3'}`} />
          <input 
            type="text" 
            placeholder={isAr ? "بحث في الملاحظات، الوسوم، أو قوائم المهام..." : "Search notes, tags, or checklists..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder:text-gray-400 py-2.5 px-3 focus:outline-none text-xs sm:text-sm font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={`p-1.5 text-gray-400 hover:text-white ${isAr ? 'mr-2' : 'ml-2'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1">
            <Pin className="w-3.5 h-3.5 fill-amber-300 rotate-45" />
            <span>{isAr ? `المثبتة في الأعلى (${pinnedNotes.length})` : `Pinned (${pinnedNotes.length})`}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinnedNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onPin={handleTogglePin} 
                onDelete={(id) => setConfirmDeleteNoteId(id)} 
                onEdit={handleOpenEditModal}
                onAction={onAction}
                onToggleTodo={handleToggleTodoCard}
                onSelectTag={(t) => setSearchQuery(t)}
                onPreviewImage={(url) => setPreviewImageModalUrl(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Notes Section */}
      <div>
        {pinnedNotes.length > 0 && otherNotes.length > 0 && (
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1 px-1">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isAr ? `بقية الملاحظات والملخصات (${otherNotes.length})` : `Other Notes & Summaries (${otherNotes.length})`}</span>
          </h3>
        )}

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-sm">
            <Bookmark className="w-10 h-10 mx-auto mb-2.5 text-amber-400/40 animate-bounce" />
            <p className="text-sm text-gray-200 font-bold">
              {isAr ? 'لا توجد ملاحظات متوفرة' : 'No notes available'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? 'اكتب ملاحظة جديدة أو احفظ المخرجات من مساعد المحادثة الذكي' : 'Write a new note or save outputs from the AI assistant'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onPin={handleTogglePin} 
                onDelete={(id) => setConfirmDeleteNoteId(id)} 
                onEdit={handleOpenEditModal}
                onAction={onAction}
                onToggleTodo={handleToggleTodoCard}
                onSelectTag={(t) => setSearchQuery(t)}
                onPreviewImage={(url) => setPreviewImageModalUrl(url)}
              />
            ))}
          </div>
        )}
      </div>

      {/* DYNAMIC GOOGLE KEEP STYLE EDIT MODAL */}
      {editingNote && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Main Modal Box */}
          <div className={`w-full h-full sm:h-[85vh] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl border-none sm:border border-white/10 ${editColor} shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden transition-all duration-300 relative`}>
            
            {/* Embedded Dark Tint */}
            <div className="absolute inset-0 bg-[#0f1422]/65 -z-10" />

            {/* Top Navigation/Action Bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-black/10">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSaveEditNote}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title={isAr ? "حفظ وإغلاق" : "Save & close"}
                >
                  <ArrowRight className={`w-5 h-5 ${isAr ? '' : 'rotate-180'}`} />
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    let promptText = isAr
                      ? `قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\nالعنوان: ${editTitle || 'ملاحظة جديدة'}\nالمحتوى: ${editContent}`
                      : `Please improve and refine the phrasing and formatting of this note:\nTitle: ${editTitle || 'New Note'}\nContent: ${editContent}`;
                    if (editTodoItems && editTodoItems.length > 0) {
                      promptText += (isAr ? `\n\nقائمة المهام المرتبطة:\n` : `\n\nLinked checklist:\n`) + editTodoItems.map(item => `${item.completed ? '[✓]' : '[ ]'} ${item.text}`).join('\n');
                    }
                    
                    const updatedNote = {
                      ...editingNote,
                      title: editTitle.trim() || (isAr ? 'ملاحظة محدثة' : 'Updated Note'),
                      content: editContent.trim(),
                      color: editColor,
                      isPinned: editIsPinned,
                      tags: editTags.length > 0 ? editTags : [isAr ? 'عام' : 'General'],
                      imageUrl: editImageUrl.trim() || undefined,
                      audioUrl: editAudioUrl.trim() || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      updatedAt: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                    setEditingNote(null);
                    setEditAudioUrl('');

                    // Sync to Firestore
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', editingNote.id), cleanObject(updatedNote));
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    onAction?.({
                      text: promptText,
                      image: editImageUrl || undefined,
                      audio: editAudioUrl || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      noteId: editingNote.id
                    });
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center"
                  title={isAr ? "مساعد الذكاء الاصطناعي لتحسين النص" : "AI Assistant to refine note"}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Pin Button */}
                <button 
                  type="button"
                  onClick={async () => {
                    const newPinnedState = !editIsPinned;
                    setEditIsPinned(newPinnedState);
                    
                    const updatedNote = {
                      ...editingNote,
                      isPinned: newPinnedState,
                      updatedAt: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                    
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', editingNote.id), cleanObject(updatedNote), { merge: true });
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className={`p-2.5 rounded-2xl transition-all ${editIsPinned ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'}`}
                  title={editIsPinned ? (isAr ? "إلغاء التثبيت" : "Unpin") : (isAr ? "تثبيت الملاحظة" : "Pin note")}
                >
                  <Pin className={`w-4.5 h-4.5 ${editIsPinned ? 'fill-amber-400 rotate-45' : ''}`} />
                </button>

                {/* Simulated Reminder Bell */}
                <button 
                  type="button"
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                  title={isAr ? "إضافة تذكير" : "Add reminder"}
                >
                  <Bell className="w-4.5 h-4.5" />
                </button>

                {/* Delete Button */}
                <button 
                  type="button"
                  onClick={() => {
                    if (editingNote) {
                      setConfirmDeleteNoteId(editingNote.id);
                    }
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-red-400 transition-all cursor-pointer"
                  title={isAr ? "حذف الملاحظة" : "Delete note"}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6 pb-24">
              
              {/* Image Preview inside edit modal */}
              {editImageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[16/9] sm:aspect-[21/9] shadow-lg group">
                  <img src={editImageUrl} alt="Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => setEditImageUrl('')}
                    className="absolute top-3 left-3 p-2 rounded-full bg-black/80 hover:bg-black text-white transition-all shadow-md"
                    title={isAr ? "حذف الصورة" : "Delete image"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Recorded Audio Player inside edit modal */}
              {editAudioUrl && (
                <div className="p-1 bg-black/15 rounded-2xl border border-white/5">
                  <VoicePlayer audioUrl={editAudioUrl} onDelete={() => setEditAudioUrl('')} />
                </div>
              )}

              {/* Title Input - borderless */}
              <input 
                type="text" 
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  const nextHistory = editHistory.slice(0, editHistoryIndex + 1);
                  setEditHistory([...nextHistory, { title: e.target.value, content: editContent }]);
                  setEditHistoryIndex(nextHistory.length);
                }}
                className="w-full bg-transparent text-white font-extrabold text-xl sm:text-2xl outline-none placeholder:text-white/20 border-none focus:ring-0 p-0"
                placeholder={isAr ? "العنوان" : "Title"}
              />

              {/* Content Textarea - borderless */}
              <textarea 
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  const nextHistory = editHistory.slice(0, editHistoryIndex + 1);
                  setEditHistory([...nextHistory, { title: editTitle, content: e.target.value }]);
                  setEditHistoryIndex(nextHistory.length);
                }}
                rows={10}
                className="w-full bg-transparent text-white text-base sm:text-lg leading-relaxed outline-none placeholder:text-white/20 border-none focus:ring-0 p-0 resize-none min-h-[220px]"
                placeholder={isAr ? "اكتب ملاحظة..." : "Take a note..."}
              />

              {/* Checklist Editor Section */}
              {editTodoItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    {isAr ? 'قائمة المهام:' : 'Checklist:'}
                  </span>
                  
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editTodoItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 group/todo bg-white/5 p-2 rounded-xl border border-white/5">
                        <button 
                          type="button" 
                          onClick={() => setEditTodoItems(editTodoItems.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t))}
                          className="text-white/30 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                        >
                          {item.completed ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                        </button>
                        <input 
                          type="text"
                          value={item.text}
                          onChange={(e) => setEditTodoItems(editTodoItems.map(t => t.id === item.id ? { ...t, text: e.target.value } : t))}
                          placeholder={isAr ? "اكتب عنصراً..." : "Write item..."}
                          className={`flex-1 bg-transparent text-xs sm:text-sm outline-none border-none p-0 focus:ring-0 ${item.completed ? 'line-through text-white/40 font-light' : 'text-white font-medium'}`}
                        />
                        <button 
                          type="button" 
                          onClick={() => setEditTodoItems(editTodoItems.filter(t => t.id !== item.id))}
                          className="text-white/30 hover:text-red-400 p-1.5 transition-all cursor-pointer"
                          title={isAr ? "إزالة" : "Remove"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline list adder */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!editTodoInput.trim()) return;
                    setEditTodoItems([...editTodoItems, { id: `todo_${Date.now()}`, text: editTodoInput.trim(), completed: false }]);
                    setEditTodoInput('');
                  }} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={isAr ? "إضافة عنصر مهام آخر..." : "Add another checklist item..."}
                      value={editTodoInput}
                      onChange={(e) => setEditTodoInput(e.target.value)}
                      className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-xl border border-white/10 outline-none focus:border-amber-500/50 placeholder:text-white/30"
                    />
                    <button 
                      type="submit" 
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 cursor-pointer shrink-0"
                    >
                      {isAr ? 'إضافة عنصر' : 'Add Item'}
                    </button>
                  </form>
                </div>
              )}

              {/* Dynamic Tag Pill list */}
              {editTags.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    {isAr ? 'الوسوم المنظمة:' : 'Organized Tags:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {editTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 text-[11px] px-3 py-1 rounded-full font-bold border border-amber-500/15">
                        #{tag}
                        <button 
                          type="button" 
                          onClick={() => setEditTags(editTags.filter(t => t !== tag))}
                          className="hover:text-red-400 text-white/40 text-xs ml-1 cursor-pointer font-extrabold"
                          title={isAr ? "حذف الوسم" : "Remove tag"}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom sticky palette selector */}
            {showColorPicker && (
              <div className="absolute bottom-16 left-4 right-4 z-[130] bg-[#141a2a]/95 border border-white/10 rounded-2xl p-3 flex items-center justify-around gap-1.5 shadow-2xl animate-scale-up animate-fade-in">
                {COLOR_OPTIONS.map((c, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => {
                      setEditColor(c.bg);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-full border border-white/20 transition-all ${c.bg} hover:scale-125 active:scale-95 cursor-pointer ${editColor === c.bg ? 'ring-2 ring-amber-400 scale-110' : ''}`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Bottom Sticky Action/Toolbar Bar (Keep-Style) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-white/5 bg-[#0e121f]/95 flex items-center justify-between px-5 z-[120] shrink-0">
              {/* Plus, Palette, Image, Mic, Text helper */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button 
                  type="button"
                  onClick={() => {
                    setEditTodoItems([...editTodoItems, { id: `todo_${Date.now()}`, text: '', completed: false }]);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "إضافة عنصر قائمة مهام" : "Add checklist item"}
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "تغيير اللون الخلفي" : "Change note color"}
                >
                  <Paintbrush className="w-4.5 h-4.5" />
                </button>
                {/* Image Upload Button */}
                <label className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                  <ImageIcon className="w-4.5 h-4.5" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                    className="hidden" 
                  />
                </label>
                {/* Voice Note Recording Button */}
                <button 
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${recording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'}`}
                  title={recording ? (isAr ? "إيقاف التسجيل وحفظ" : "Stop & save") : (isAr ? "تسجيل ملاحظة صوتية" : "Record voice note")}
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>

              </div>

              {/* Undo, Redo, Tag, and Save */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <button 
                  type="button"
                  disabled={editHistoryIndex <= 0}
                  onClick={() => {
                    if (editHistoryIndex > 0) {
                      const idx = editHistoryIndex - 1;
                      setEditHistoryIndex(idx);
                      const state = editHistory[idx];
                      setEditTitle(state.title);
                      setEditContent(state.content);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all ${editHistoryIndex > 0 ? 'bg-white/5 text-white/80 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                  title={isAr ? "تراجع" : "Undo"}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  disabled={editHistoryIndex >= editHistory.length - 1}
                  onClick={() => {
                    if (editHistoryIndex < editHistory.length - 1) {
                      const idx = editHistoryIndex + 1;
                      setEditHistoryIndex(idx);
                      const state = editHistory[idx];
                      setEditTitle(state.title);
                      setEditContent(state.content);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all ${editHistoryIndex < editHistory.length - 1 ? 'bg-white/5 text-white/80 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                  title={isAr ? "إعادة" : "Redo"}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                
                {/* Tag trigger popup */}
                <button 
                  type="button"
                  onClick={() => {
                    const tag = prompt(isAr ? "أدخل وسماً للملاحظة:" : "Enter a tag for the note:");
                    if (tag && tag.trim()) {
                      if (!editTags.includes(tag.trim())) {
                        setEditTags([...editTags, tag.trim()]);
                      }
                    }
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  title={isAr ? "إضافة وسم جديد" : "Add tag"}
                >
                  <Tag className="w-4 h-4" />
                </button>

                {/* Save and Exit */}
                <button
                  type="button"
                  onClick={handleSaveEditNote}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                >
                  {isAr ? 'تم' : 'Done'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox Modal */}
      {previewImageModalUrl && (
        <div 
          onClick={() => setPreviewImageModalUrl(null)}
          className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} flex items-center gap-3 z-10`}>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(previewImageModalUrl);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `note_image_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  window.open(previewImageModalUrl, '_blank');
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تحميل الصورة' : 'Download image'}</span>
            </button>
            <button
              type="button"
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
              alt="Full Note Image Preview" 
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

      {/* Custom Delete Confirmation Modal */}
      {confirmDeleteNoteId && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-sm rounded-3xl bg-[#141a2a] border border-white/15 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {isAr ? 'حذف الملاحظة' : 'Delete Note'}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {isAr ? 'هل أنت متأكد من حذف هذه الملاحظة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to permanently delete this note? This action cannot be undone.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteNoteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmDeleteNoteId;
                  setConfirmDeleteNoteId(null);
                  if (id) {
                    handleDeleteNote(id);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                {isAr ? 'حذف نهائياً' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: KeepNote;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (note: KeepNote) => void;
  onAction?: (msg: string | { text: string; image?: string; audio?: string; items?: any[]; noteId?: string }) => void;
  onToggleTodo: (noteId: string, itemId: string) => void;
  onSelectTag: (tag: string) => void;
  onPreviewImage?: (url: string) => void;
}

function NoteCard({ note, onPin, onDelete, onEdit, onAction, onToggleTodo, onSelectTag, onPreviewImage }: NoteCardProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [copied, setCopied] = useState(false);

  const { text: displayText, imageUrl: displayImageUrl } = processNoteContent(note.content, note.imageUrl);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let text = `${note.title}\n\n${displayText}`;
    if (note.items && note.items.length > 0) {
      text += (isAr ? `\n\nقائمة المهام الفرعية:\n` : `\n\nSub-tasks:\n`) + note.items.map(i => `${i.completed ? '[✓]' : '[ ]'} ${i.text}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    let text = isAr 
      ? `=========================\n${note.title}\nتاريخ التحديث: ${note.updatedAt}\n=========================\n\n${displayText}`
      : `=========================\n${note.title}\nUpdated At: ${note.updatedAt}\n=========================\n\n${displayText}`;
    if (note.items && note.items.length > 0) {
      text += (isAr ? `\n\nقائمة المهام الفرعية:\n` : `\n\nSub-tasks:\n`) + note.items.map(i => `${i.completed ? '✓' : ' '} - ${i.text}`).join('\n');
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^\w\u0600-\u06FF\s]/g, '') || 'note'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      onClick={() => onEdit(note)}
      dir={isAr ? 'rtl' : 'ltr'}
      className={`p-4 rounded-2xl border ${note.color} shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-md group relative overflow-hidden cursor-pointer select-none`}
    >
      {/* Absolute top glow indicator for Pinned */}
      {note.isPinned && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-pink-500 opacity-90 shadow-[0_0_8px_#f59e0b]" />
      )}

      <div>
        {/* Top bar with pin & edit controls */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45 fill-amber-400" />}
            <h4 className="font-bold text-xs sm:text-sm text-gray-100 leading-tight truncate">{note.title}</h4>
          </div>

          <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${note.isPinned ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}
              title={note.isPinned ? (isAr ? "إلغاء التثبيت" : "Unpin") : (isAr ? "تثبيت" : "Pin")}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-300 rotate-45' : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(note); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
              title={isAr ? "تعديل وتحديث" : "Edit note"}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                let promptText = isAr
                  ? `لخص هذه الملاحظة أو قم بتحسينها وصياغتها بشكل أفضل: \nالعنوان: ${note.title}\nالمحتوى: ${displayText}`
                  : `Please summarize or refine this note:\nTitle: ${note.title}\nContent: ${displayText}`;
                if (note.items && note.items.length > 0) {
                  promptText += (isAr ? `\n\nقائمة المهام المرتبطة:\n` : `\n\nLinked checklist:\n`) + note.items.map(item => `${item.completed ? '[✓]' : '[ ]'} ${item.text}`).join('\n');
                }
                onAction?.({
                  text: promptText,
                  image: displayImageUrl || undefined,
                  audio: note.audioUrl || undefined,
                  items: note.items && note.items.length > 0 ? note.items : undefined,
                  noteId: note.id
                }); 
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-300 hover:bg-white/10 transition-colors"
              title={isAr ? "مساعد الذكاء الاصطناعي" : "AI Assistant"}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(note.id); 
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title={isAr ? 'حذف' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Attached image display */}
        {displayImageUrl && (
          <div 
            onClick={(e) => {
              if (onPreviewImage) {
                e.stopPropagation();
                onPreviewImage(displayImageUrl);
              }
            }}
            className="rounded-xl overflow-hidden mb-2.5 border border-white/10 aspect-[16/9] shadow-inner relative group/image bg-black/40 cursor-pointer"
          >
            <img 
              src={displayImageUrl} 
              alt={note.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-105" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('/api/image-proxy')) {
                  target.src = `/api/image-proxy?url=${encodeURIComponent(displayImageUrl)}`;
                }
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/20">
                <Maximize2 className="w-3.5 h-3.5" />
                {isAr ? 'معاينة الصورة' : 'Preview image'}
              </span>
            </div>
          </div>
        )}

        {/* Attached audio player */}
        {note.audioUrl && (
          <div className="mb-2.5">
            <VoicePlayer audioUrl={note.audioUrl} readOnly={true} />
          </div>
        )}

        {/* Content text */}
        {displayText && (
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap mb-3 font-normal select-text">
            {displayText}
          </p>
        )}

        {/* Checklist item renderer */}
        {note.items && note.items.length > 0 && (
          <div className="space-y-1.5 my-2.5 bg-black/20 p-2.5 rounded-xl border border-white/5 backdrop-blur-md">
            {note.items.map((item) => (
              <div 
                key={item.id} 
                onClick={(e) => { e.stopPropagation(); onToggleTodo(note.id, item.id); }}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-all"
              >
                <div className="text-amber-400 shrink-0">
                  {item.completed ? <CheckSquare className="w-4 h-4 fill-amber-400/20" /> : <Square className="w-4 h-4" />}
                </div>
                <span className={`text-xs select-none truncate ${item.completed ? 'line-through text-gray-500 font-light' : 'text-gray-200 font-medium'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer bar with Tags, Date & helper actions */}
      <div className="flex flex-col gap-2 pt-2.5 border-t border-white/[0.08] mt-auto">
        <div className="flex flex-wrap gap-1">
          {note.tags && note.tags.map((tag, i) => (
            <button 
              key={i} 
              onClick={(e) => { e.stopPropagation(); onSelectTag(tag); }}
              className="bg-white/5 hover:bg-amber-500/15 text-amber-300 hover:text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/20 transition-all cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{note.updatedAt}</span>
          </div>

          {/* Quick actions (Copy & Download) */}
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => handleCopy(e)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isAr ? "نسخ إلى الحافظة" : "Copy to clipboard"}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={(e) => handleDownload(e)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={isAr ? "تحميل كمستند نصي" : "Download as text file"}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VoicePlayerProps {
  audioUrl: string;
  onDelete?: () => void;
  readOnly?: boolean;
}

function VoicePlayer({ audioUrl, onDelete, readOnly = false }: VoicePlayerProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audio] = useState(() => {
    const a = new Audio(audioUrl);
    a.preload = "auto";
    return a;
  });

  useEffect(() => {
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [audio]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(err => console.error("Audio playback failed", err));
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = isAr ? (rect.right - e.clientX) : (e.clientX - rect.left);
    const width = rect.width;
    const clickPercent = Math.max(0, Math.min(1, clickX / width));
    if (audio.duration) {
      audio.currentTime = clickPercent * audio.duration;
      setProgress(clickPercent * 100);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 w-full select-none shadow-inner" onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Play/Pause Button */}
      <button 
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all shadow shrink-0 cursor-pointer"
      >
        {playing ? (
          <span className="flex gap-1 items-center justify-center">
            <span className="w-1 h-3.5 bg-slate-950 rounded animate-pulse" />
            <span className="w-1 h-3.5 bg-slate-950 rounded animate-pulse delay-100" />
          </span>
        ) : (
          <svg className="w-4 h-4 fill-slate-950 ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress Track */}
      <div 
        onClick={handleSeek}
        className="flex-1 h-2 bg-white/10 rounded-full relative cursor-pointer overflow-hidden group"
      >
        <div 
          className={`absolute top-0 ${isAr ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} h-full from-amber-400 to-amber-500 rounded-full transition-all duration-100`} 
          style={{ width: `${progress}%` }} 
        />
        {/* Seek slider thumb dot */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow border border-amber-500"
          style={isAr ? { right: `calc(${progress}% - 5px)` } : { left: `calc(${progress}% - 5px)` }}
        />
      </div>

      {/* Delete/Trash Button */}
      {!readOnly && onDelete && (
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          title={isAr ? "حذف التسجيل" : "Delete recording"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

