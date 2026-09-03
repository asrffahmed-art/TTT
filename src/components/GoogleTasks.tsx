import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trash2, Calendar, RefreshCw, 
  ListTodo, Check, Sparkles, Filter, AlertCircle, ChevronDown, 
  ExternalLink, LogIn, Edit2, AlarmClock, CalendarDays
} from 'lucide-react';
import { AlarmsView, CalendarView } from './StudyTools';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, cleanObject } from '../lib/firebase';
import { useAppTheme } from '../lib/themeService';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  listId?: string;
}

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTasksProps {
  onAction?: (msg: string) => void;
}

export function GoogleTasks({ onAction }: GoogleTasksProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const theme = useAppTheme();

  // Unified hub (owner directive): tasks + study tools (alarms & calendar)
  // merged into ONE page with three sections. Study tools stay 100% local
  // (localStorage) while tasks keep their existing local/cloud sync.
  const [section, setSection] = useState<'tasks' | 'alarms' | 'calendar'>('tasks');
  const [taskLists, setTaskLists] = useState<TaskList[]>([
    { id: 'default', title: isAr ? 'مهامي الرئيسية' : 'My Main Tasks' }
  ]);
  const [activeListId, setActiveListId] = useState<string>('default');
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const userId = auth.currentUser ? auth.currentUser.uid : 'guest';
    const saved = localStorage.getItem(`app-google-tasks-${userId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // New task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // New list state
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Confirmation modal state for destructive operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Save tasks scoped to current user account
  useEffect(() => {
    const userId = auth.currentUser ? auth.currentUser.uid : 'guest';
    localStorage.setItem(`app-google-tasks-${userId}`, JSON.stringify(tasks));
  }, [tasks]);

  // Clean placeholder strings if any
  useEffect(() => {
    setTasks(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if (t.title.includes('Google Tasks') || t.title.includes('المهام مع المهام')) {
          changed = true;
          return { ...t, title: t.title.replace(/Google Tasks/g, 'THOTH').replace(/المهام مع المهام/g, 'المهام') };
        }
        if (t.notes && t.notes.includes('Google')) {
          changed = true;
          return { ...t, notes: t.notes.replace(/Google/g, 'THOTH') };
        }
        return t;
      });
      return changed ? updated : prev;
    });
  }, []);

  // Listen to Auth State Changes & Sync User Tasks from Cloud
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Load user-specific cached tasks first
        const saved = localStorage.getItem(`app-google-tasks-${user.uid}`);
        if (saved) {
          try {
            setTasks(JSON.parse(saved));
          } catch (e) {}
        } else {
          setTasks([]);
        }

        // Setup real-time listener for current user's tasks
        try {
          unsubscribeSnapshot = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snap) => {
            const cloudTasks: TaskItem[] = [];
            snap.forEach(d => {
              const data = d.data() as TaskItem;
              cloudTasks.push({
                ...data,
                id: d.id,
                status: data.status === 'completed' ? 'completed' : 'needsAction'
              });
            });
            setTasks(cloudTasks);
          }, (error) => {
            console.warn('Tasks real-time listener error:', error);
          });
        } catch (e) {
          console.error('Fetch cloud tasks error:', e);
        }
      } else {
        // Logged out / guest user
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        const guestSaved = localStorage.getItem('app-google-tasks-guest');
        if (guestSaved) {
          try { setTasks(JSON.parse(guestSaved)); } catch (e) { setTasks([]); }
        } else {
          setTasks([]);
        }
      }
    });

    const storedToken = localStorage.getItem('google-access-token');
    if (storedToken && !accessToken) {
      setAccessToken(storedToken);
      fetchGoogleTaskLists(storedToken);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Connect & Fetch from المهام API if OAuth token available
  const handleGoogleConnect = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/tasks');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setAccessToken(token);
        localStorage.setItem('google-access-token', token);
        setStatusMessage({ type: 'success', text: isAr ? 'تم الربط بـ المهام بنجاح!' : 'Tasks connected successfully!' });
        await fetchGoogleTaskLists(token);
      } else {
        setStatusMessage({ type: 'error', text: isAr ? 'تعذر الحصول على تصريح المهام. يمكنك التفاعل مع المهام محلياً.' : 'Could not authorize Tasks. You can use local tasks.' });
      }
    } catch (err: any) {
      console.warn('Tasks auth note:', err?.code || err?.message);
      setStatusMessage({ type: 'error', text: isAr ? 'تعذر الاتصال المباشر بـ المهام حالياً. يمكنك استخدام إدارة المهام المحلية بحرية!' : 'Direct sync unavailable. You can use local task management freely!' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleTaskLists = async (token: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const fetchedLists: TaskList[] = data.items.map((item: any) => ({
            id: item.id,
            title: item.title,
            updated: item.updated
          }));
          setTaskLists(fetchedLists);
          setActiveListId(fetchedLists[0].id);
          await fetchGoogleTasksForList(token, fetchedLists[0].id);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Tasks API response error:', errData);
      }
    } catch (err) {
      console.error('Fetch task lists error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchGoogleTasksForList = async (token: string, listId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          const fetchedTasks: TaskItem[] = data.items.map((item: any) => ({
            id: item.id,
            title: item.title || 'بدون عنوان',
            notes: item.notes || '',
            status: item.status === 'completed' ? 'completed' : 'needsAction',
            due: item.due,
            updated: item.updated,
            listId: listId
          }));
          setTasks(prev => {
            const otherTasks = prev.filter(t => t.listId !== listId);
            return [...otherTasks, ...fetchedTasks];
          });
          setStatusMessage({ type: 'success', text: isAr ? `تم جلب ${data.items.length} مهمة من المهام!` : `Fetched ${data.items.length} tasks successfully!` });
        } else {
          setTasks(prev => prev.filter(t => t.listId !== listId));
        }
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskObj: TaskItem = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      notes: newTaskNotes.trim(),
      status: 'needsAction',
      due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
      listId: activeListId
    };

    // Immediate UI update
    setTasks(prev => [taskObj, ...prev]);
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskDue('');
    setIsAddingTask(false);

    // Call API if connected
    if (accessToken && activeListId !== 'default') {
      try {
        const bodyPayload: any = {
          title: taskObj.title,
          notes: taskObj.notes,
        };
        if (taskObj.due) bodyPayload.due = taskObj.due;

        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        });
        if (res.ok) {
          const created = await res.json();
          setTasks(prev => prev.map(t => t.id === taskObj.id ? { ...t, id: created.id } : t));
        }
      } catch (err) {
        console.error('Add Google task error:', err);
      }
    }

    // Backup to Firestore
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'tasks', taskObj.id), cleanObject(taskObj));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Toggle task completed status
  const handleToggleTask = async (task: TaskItem) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    if (accessToken && activeListId !== 'default') {
      try {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks/${task.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: newStatus,
            completed: newStatus === 'completed' ? new Date().toISOString() : null
          })
        });
      } catch (err) {
        console.error('Toggle Google task error:', err);
      }
    }

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), cleanObject({ ...task, status: newStatus }), { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Destructive: Delete Task (requires explicit confirmation dialog)
  const requestDeleteTask = (task: TaskItem) => {
    setConfirmModal({
      isOpen: true,
      title: isAr ? 'تأكيد حذف المهمة' : 'Confirm Task Deletion',
      description: isAr 
        ? `هل أنت متأكد من حذف المهمة "${task.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete task "${task.title}"? This action cannot be undone.`,
      onConfirm: () => executeDeleteTask(task)
    });
  };

  const executeDeleteTask = async (task: TaskItem) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));

    if (accessToken && activeListId !== 'default') {
      try {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${activeListId}/tasks/${task.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (err) {
        console.error('Delete Google task error:', err);
      }
    }

    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', task.id));
      } catch (e) {
        console.error(e);
      }
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Add a new task list
  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const newList: TaskList = {
      id: `list_${Date.now()}`,
      title: newListTitle.trim()
    };

    setTaskLists(prev => [...prev, newList]);
    setActiveListId(newList.id);
    setNewListTitle('');
    setIsAddingList(false);

    if (accessToken) {
      try {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: newList.title })
        });
        if (res.ok) {
          const created = await res.json();
          setTaskLists(prev => prev.map(l => l.id === newList.id ? { ...l, id: created.id } : l));
          setActiveListId(created.id);
        }
      } catch (err) {
        console.error('Add task list error:', err);
      }
    }
  };

  // Destructive: Delete Task List (requires explicit confirmation dialog)
  const requestDeleteList = (listId: string) => {
    const list = taskLists.find(l => l.id === listId);
    if (!list) return;

    setConfirmModal({
      isOpen: true,
      title: isAr ? 'تأكيد حذف قائمة المهام' : 'Confirm Task List Deletion',
      description: isAr 
        ? `هل أنت متأكد من حذف القائمة "${list.title}" وجميع المهام الموجودة بداخلها؟`
        : `Are you sure you want to delete the list "${list.title}" and all its tasks?`,
      onConfirm: () => executeDeleteList(listId)
    });
  };

  const executeDeleteList = async (listId: string) => {
    setTaskLists(prev => prev.filter(l => l.id !== listId));
    setTasks(prev => prev.filter(t => t.listId !== listId));
    setActiveListId('default');

    if (accessToken && listId !== 'default') {
      try {
        await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${listId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (err) {
        console.error('Delete task list error:', err);
      }
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (t.listId && t.listId !== activeListId) return false;
    if (filterStatus === 'active') return t.status === 'needsAction';
    if (filterStatus === 'completed') return t.status === 'completed';
    return true;
  });

  const activeCount = tasks.filter(t => (t.listId === activeListId || !t.listId) && t.status === 'needsAction').length;
  const completedCount = tasks.filter(t => (t.listId === activeListId || !t.listId) && t.status === 'completed').length;

  return (
    <div 
      className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.previewGradient} p-0.5 shadow-lg`}>
            <div className={`w-full h-full bg-[#141824] rounded-[10px] flex items-center justify-center`}>
              <ListTodo className={`w-5 h-5 ${theme.textAccent}`} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-3">
              <span>{isAr ? 'المهام والدراسة' : 'Tasks & Study'}</span>
              <span className={`text-[10px] ${theme.bgAccent} ${theme.textAccentBright} px-2 py-0.5 rounded-full border ${theme.borderAccent} font-mono font-bold`}>
                THOTH
              </span>
            </h1>
            <p className="text-[11px] text-white/40 mt-0.5">
              {isAr ? 'مهامك ومنبهك وتقويم دراستك في مكان واحد' : 'Your tasks, alarms and study calendar in one place'}
            </p>
          </div>
        </div>

        {section === 'tasks' && (
          <div className="flex items-center gap-2">
            {!accessToken ? (
              <button
                onClick={handleGoogleConnect}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${theme.btnPrimary} text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50`}
              >
                <LogIn className="w-4 h-4" />
                <span>{isAr ? 'مزامنة المهام' : 'Sync Tasks'}</span>
              </button>
            ) : (
              <button
                onClick={() => fetchGoogleTaskLists(accessToken)}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ${theme.bgAccent} border ${theme.borderAccent} ${theme.textAccentBright} text-xs font-bold transition-all active:scale-95 shadow-md`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? `animate-spin ${theme.textAccent}` : ''}`} />
                <span>{isAr ? 'تحديث المهام' : 'Refresh Tasks'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hub sections: المهام | المنبه | التقويم */}
      <div className="flex gap-2 mb-5 shrink-0">
        <button
          onClick={() => setSection('tasks')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${section === 'tasks' ? theme.activeTabClass : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
        >
          <ListTodo className="w-4 h-4" />
          <span>{isAr ? 'المهام' : 'Tasks'}</span>
        </button>
        <button
          onClick={() => setSection('alarms')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${section === 'alarms' ? theme.activeTabClass : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
        >
          <AlarmClock className="w-4 h-4" />
          <span>{isAr ? 'المنبه' : 'Alarms'}</span>
        </button>
        <button
          onClick={() => setSection('calendar')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${section === 'calendar' ? theme.activeTabClass : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{isAr ? 'التقويم' : 'Calendar'}</span>
        </button>
      </div>

      {section === 'alarms' && <AlarmsView />}

      {section === 'calendar' && <CalendarView tasks={tasks} onToggleTask={handleToggleTask} />}

      {section === 'tasks' && (<>


      {/* Status banner */}
      {statusMessage && (
        <div className={`mb-4 p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
          statusMessage.type === 'success' ? `${theme.bgAccent} border ${theme.borderAccent} ${theme.textAccentBright}` : 'bg-red-500/20 border-red-500/40 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${theme.textAccent}`} />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-white/40 hover:text-white">×</button>
        </div>
      )}

      {/* Task List Selector / Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 hide-scrollbar">
        {taskLists.map(list => (
          <div key={list.id} className="flex items-center shrink-0">
            <button
              onClick={() => {
                setActiveListId(list.id);
                if (accessToken && list.id !== 'default') {
                  fetchGoogleTasksForList(accessToken, list.id);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeListId === list.id 
                  ? `${theme.bgAccent} border ${theme.borderAccent} ${theme.textAccentBright} shadow-lg` 
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{list.title}</span>
            </button>
            {list.id !== 'default' && activeListId === list.id && (
              <button
                onClick={() => requestDeleteList(list.id)}
                className="mx-1 p-1.5 text-white/30 hover:text-red-400 transition-colors"
                title={isAr ? 'حذف القائمة' : 'Delete List'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {!isAddingList ? (
          <button
            onClick={() => setIsAddingList(true)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
          >
            <Plus className={`w-3.5 h-3.5 ${theme.textAccent}`} />
            <span>{isAr ? 'قائمة جديدة' : 'New List'}</span>
          </button>
        ) : (
          <form onSubmit={handleAddList} className="flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              placeholder={isAr ? 'اسم القائمة الجديدة...' : 'New list name...'}
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              className={`bg-white/10 border ${theme.borderAccent} text-white text-xs px-3 py-1.5 rounded-xl outline-none`}
              autoFocus
            />
            <button type="submit" className={`px-2.5 py-1.5 ${theme.btnPrimary} text-xs font-bold rounded-xl`}>{isAr ? 'إضافة' : 'Add'}</button>
            <button type="button" onClick={() => setIsAddingList(false)} className="px-2 py-1.5 text-white/50 hover:text-white text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
          </form>
        )}
      </div>

      {/* Task Filters & Add Button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'all' ? `${theme.bgAccent} ${theme.textAccentBright}` : 'text-white/50 hover:text-white'}`}
          >
            {isAr ? 'الكل' : 'All'} ({activeCount + completedCount})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'active' ? `${theme.bgAccent} ${theme.textAccentBright}` : 'text-white/50 hover:text-white'}`}
          >
            {isAr ? 'النشطة' : 'Active'} ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'completed' ? `${theme.bgAccent} ${theme.textAccentBright}` : 'text-white/50 hover:text-white'}`}
          >
            {isAr ? 'المكتملة' : 'Completed'} ({completedCount})
          </button>
        </div>

        {!isAddingTask && (
          <button
            onClick={() => setIsAddingTask(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${theme.btnPrimary} text-xs font-bold shadow-lg active:scale-95 transition-all`}
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مهمة' : 'Add Task'}</span>
          </button>
        )}
      </div>

      {/* Add Task Form */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className={`mb-6 p-5 rounded-2xl bg-white/5 border ${theme.borderAccent} shadow-xl backdrop-blur-xl flex flex-col gap-3 focus-within:bg-white/10 transition-all`}>
          <input
            type="text"
            placeholder={isAr ? 'عنوان المهمة الجديدة...' : 'New task title...'}
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            className="bg-transparent text-white font-bold text-sm outline-none placeholder:text-white/30"
            autoFocus
          />
          <textarea
            placeholder={isAr ? 'تفاصيل الملاحظات أو الخطوات الفرعية (اختياري)...' : 'Notes or sub-steps details (optional)...'}
            value={newTaskNotes}
            onChange={e => setNewTaskNotes(e.target.value)}
            rows={2}
            className="bg-transparent text-white text-xs outline-none placeholder:text-white/30 resize-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${theme.textAccent}`} />
              <input
                type="date"
                value={newTaskDue}
                onChange={e => setNewTaskDue(e.target.value)}
                className="bg-white/10 border border-white/10 text-white text-xs px-2.5 py-1 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className={`px-4 py-1.5 rounded-xl ${theme.btnPrimary} text-xs font-bold shadow-lg active:scale-95 transition-all`}
              >
                {isAr ? 'حفظ المهمة' : 'Save Task'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:text-white text-xs font-bold hover:bg-white/20 transition-all"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List Items */}
      <div className="flex flex-col gap-2.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-xs font-bold">{isAr ? 'لا توجد مهام في هذه القائمة حالياً' : 'No tasks in this list currently'}</p>
            <p className="text-[11px] text-white/20 mt-1">
              {isAr ? 'اضغط على "إضافة مهمة" لبدء تنظيم مهامك أو قم بمزامنتها' : 'Click "Add Task" to start organizing your tasks or sync them'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3 group ${task.status === 'completed' ? 'bg-white/5 border-white/5 text-white/40 opacity-70' : 'bg-white/5 border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20 shadow-lg'}`}
            >
              <button
                onClick={() => handleToggleTask(task)}
                className="mt-0.5 shrink-0 transition-transform active:scale-90"
                title={task.status === 'completed' ? (isAr ? 'تحديد كغير مكتملة' : 'Mark as incomplete') : (isAr ? 'تحديد كمكتملة' : 'Mark as completed')}
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className={`w-5 h-5 ${theme.textAccent}`} />
                ) : (
                  <Circle className={`w-5 h-5 text-white/40 hover:${theme.textAccent} transition-colors`} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold leading-snug ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white'}`}>
                  {task.title}
                </h4>
                {task.notes && (
                  <p className={`text-xs mt-1 leading-relaxed ${task.status === 'completed' ? 'line-through text-white/30' : 'text-white/60'}`}>
                    {task.notes}
                  </p>
                )}
                {task.due && (
                  <div className={`flex items-center gap-1 mt-2 text-[10px] ${theme.textAccent} font-mono`}>
                    <Calendar className="w-3 h-3" />
                    <span>{isAr ? 'تاريخ الاستحقاق:' : 'Due date:'} {new Date(task.due).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onAction?.(isAr 
                  ? `كيف يمكنني إنجاز هذه المهمة بشكل أفضل؟ \nالمهمة: ${task.title}${task.notes ? '\nملاحظات: ' + task.notes : ''}`
                  : `How can I accomplish this task more effectively? \nTask: ${task.title}${task.notes ? '\nNotes: ' + task.notes : ''}`
                )}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all"
                title={isAr ? 'مساعدة من الذكاء الاصطناعي' : 'AI Task Assistant'}
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => requestDeleteTask(task)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                title={isAr ? 'حذف المهمة' : 'Delete Task'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      </>)}

      {/* Mandatory User Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div 
            className={`w-full max-w-sm rounded-2xl bg-[#1a1c2c] border border-white/15 p-6 shadow-2xl flex flex-col gap-4 ${isAr ? 'text-right' : 'text-left'}`}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
