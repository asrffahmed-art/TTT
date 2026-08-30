import { auth } from './firebase';
import { 
  getUserChatSessions, 
  getChatSessionMessages, 
  saveChatMessageWithStorageCheck, 
  deleteChatOrMessage, 
  renameChatSession, 
  togglePinChatSession,
  ChatMessageRecord
} from './subscriptionService';

export interface ChatSession {
  id: string;
  title: string;
  desc?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  totalSize?: number;
  hasMedia?: boolean;
  lastMediaType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  lastMediaThumbnail?: string;
  isPinned?: boolean;
  isFirestore?: boolean;
}

export interface ChatMessage {
  id: string | number;
  text: string;
  isUser: boolean;
  role?: string;
  time?: string;
  timestamp?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  mediaSize?: number;
  compressionInfo?: any;
  attachments?: any[];
  images?: any[];
  sources?: any[];
  relatedSources?: any[];
  modelUsed?: string;
  searchGrounding?: any;
  chartData?: any;
  isFavorite?: boolean;
  modelConfidence?: number;
  senderId?: string;
}

// Get Effective User ID (returns null for unauthenticated guests)
export function getEffectiveUserId(): string | null {
  const currentFirebaseUid = auth.currentUser?.uid;
  if (currentFirebaseUid && currentFirebaseUid !== 'guest') {
    return currentFirebaseUid;
  }
  const isAuth = localStorage.getItem('isAuth') === 'true';
  if (!isAuth) return null;
  const uid = localStorage.getItem('app-user-id') || null;
  if (!uid || uid === 'guest') return null;
  return uid;
}

// Helper to check if current user is signed in
export function isUserAuthenticated(): boolean {
  return getEffectiveUserId() !== null;
}

// Helper to get scoped keys per user account
function getSessionsStorageKey(userId: string | null): string {
  return userId ? `thoth_user_sessions_${userId}` : 'thoth_guest_sessions';
}

function getActiveChatStorageKey(userId: string | null): string {
  return userId ? `thoth_active_chat_${userId}` : 'thoth_guest_active_session';
}

function getSessionMsgsStorageKey(userId: string | null, sessionId: string): string {
  return userId ? `thoth_user_msgs_${userId}_${sessionId}` : `thoth_guest_msgs_${sessionId}`;
}

function getDeletedSessionsKey(userId: string | null): string {
  return userId ? `thoth_deleted_sessions_${userId}` : 'thoth_guest_deleted_sessions';
}

function getDeletedSessionsSet(userId: string | null): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(getDeletedSessionsKey(userId));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function markSessionDeletedLocally(userId: string | null, sessionId: string): void {
  if (!userId || !sessionId) return;
  try {
    const set = getDeletedSessionsSet(userId);
    set.add(sessionId);
    // Keep max 500 tombstones
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(getDeletedSessionsKey(userId), JSON.stringify(arr));
  } catch (e) {}
}

function unmarkSessionDeleted(userId: string | null, sessionId: string): void {
  if (!userId || !sessionId) return;
  try {
    const set = getDeletedSessionsSet(userId);
    if (set.has(sessionId)) {
      set.delete(sessionId);
      localStorage.setItem(getDeletedSessionsKey(userId), JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

// Get current active session ID
export function getActiveSessionId(): string {
  const userId = getEffectiveUserId();
  const key = getActiveChatStorageKey(userId);
  let activeId = localStorage.getItem(key);
  if (!activeId) {
    activeId = `session_${Date.now()}`;
    localStorage.setItem(key, activeId);
  }
  return activeId;
}

// Set active session ID
export function setActiveSessionId(sessionId: string): void {
  const userId = getEffectiveUserId();
  const key = getActiveChatStorageKey(userId);
  localStorage.setItem(key, sessionId);
  window.dispatchEvent(new CustomEvent('thoth_active_session_changed', { detail: { sessionId } }));
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000; // 1 year retention

function isSessionWithinOneYear(session: ChatSession): boolean {
  if (!session) return false;
  const time = new Date(session.updatedAt || session.createdAt || 0).getTime();
  if (time <= 0) return true; // keep if timestamp missing or corrupted
  return (Date.now() - time) <= ONE_YEAR_MS;
}

// Get all cached sessions strictly for current user
export function getCachedSessions(): ChatSession[] {
  const userId = getEffectiveUserId();
  if (!userId) return []; // Guests have no saved sessions

  try {
    const raw = localStorage.getItem(getSessionsStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const deletedSet = getDeletedSessionsSet(userId);
        return parsed.filter(s => s && s.id && !deletedSet.has(s.id));
      }
    }
  } catch (e) {
    console.error('Error reading cached sessions:', e);
  }
  return [];
}

// Fetch all sessions strictly for current logged-in user
export async function loadAllSessions(): Promise<ChatSession[]> {
  const userId = getEffectiveUserId();
  
  // GUESTS: Completely disable history loading & saving
  if (!userId) {
    return [];
  }

  const deletedSet = getDeletedSessionsSet(userId);
  let userList = getCachedSessions().filter(s => !deletedSet.has(s.id));

  try {
    const serverSessions = await getUserChatSessions(userId);
    if (serverSessions && serverSessions.length > 0) {
      const sessionMap = new Map<string, ChatSession>();
      
      // Populate server sessions for THIS user only (ignoring deleted ones)
      serverSessions.forEach(s => {
        if (s && s.id && !deletedSet.has(s.id)) {
          sessionMap.set(s.id, {
            ...s,
            isFirestore: true
          });
        }
      });

      // Merge local user-specific sessions
      userList.forEach(s => {
        if (!deletedSet.has(s.id)) {
          if (!sessionMap.has(s.id)) {
            sessionMap.set(s.id, s);
          } else {
            const existing = sessionMap.get(s.id)!;
            sessionMap.set(s.id, {
              ...existing,
              ...s,
              isFirestore: true
            });
          }
        }
      });

      userList = Array.from(sessionMap.values());
    }
  } catch (err) {
    console.error('Error fetching sessions from server:', err);
  }

  // Sort: Pinned first, then updatedAt / createdAt desc
  userList.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  localStorage.setItem(getSessionsStorageKey(userId), JSON.stringify(userList));
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: userList } }));
  return userList;
}

function normalizeMessageImages(msg: ChatMessage): ChatMessage {
  if (!msg) return msg;
  let imageUrl = msg.imageUrl || (msg.messageType === 'image' ? msg.mediaUrl : undefined);
  let images = Array.isArray(msg.images) && msg.images.length > 0 ? [...msg.images] : [];

  if (!imageUrl && !images.length && msg.text) {
    const mdMatch = msg.text.match(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/);
    if (mdMatch) {
      imageUrl = mdMatch[2];
      images = [{ url: mdMatch[2], description: mdMatch[1] || 'صورة' }];
    } else {
      const pollMatch = msg.text.match(/(https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\*]+)/i);
      if (pollMatch) {
        imageUrl = pollMatch[1];
        images = [{ url: pollMatch[1], description: 'Generated AI Image' }];
      } else {
        const rawImgMatch = msg.text.match(/(https?:\/\/[^\s\)\*]+?\.(?:png|jpg|jpeg|webp|gif))/i);
        if (rawImgMatch) {
          imageUrl = rawImgMatch[1];
          images = [{ url: rawImgMatch[1], description: 'صورة' }];
        }
      }
    }
  }

  return {
    ...msg,
    imageUrl: imageUrl || msg.imageUrl,
    images: images.length > 0 ? images : msg.images
  };
}

// Get local cached messages synchronously for immediate initial render
export function getLocalSessionMessagesSync(sessionId: string): ChatMessage[] {
  if (!sessionId) return [];
  const userId = getEffectiveUserId();
  if (!userId) return [];

  const deletedSet = getDeletedSessionsSet(userId);
  if (deletedSet.has(sessionId)) return [];

  const cacheKey = getSessionMsgsStorageKey(userId, sessionId);
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeMessageImages);
      }
    }
  } catch (e) {}
  return [];
}

// Load messages for a given session
export async function loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  if (!sessionId) return [];
  const userId = getEffectiveUserId();

  // For Guests: no saved persistent history
  if (!userId) {
    return [];
  }

  const deletedSet = getDeletedSessionsSet(userId);
  if (deletedSet.has(sessionId)) {
    return [];
  }

  const cacheKey = getSessionMsgsStorageKey(userId, sessionId);
  let messages: ChatMessage[] = [];

  // 1. Try local user-scoped storage cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages = parsed;
      }
    }
  } catch (e) {}

  // 2. Fetch from Firestore server for this specific user
  try {
    const serverMsgs = await getChatSessionMessages(userId, sessionId);
    if (serverMsgs && Array.isArray(serverMsgs) && serverMsgs.length > 0) {
      messages = serverMsgs;
      localStorage.setItem(cacheKey, JSON.stringify(serverMsgs));
    }
  } catch (err) {
    console.warn('Could not fetch remote session messages, using local cache:', err);
  }

  return messages.map(normalizeMessageImages);
}

// Save messages list to a session
export function saveLocalSessionMessages(sessionId: string, messages: ChatMessage[]): void {
  const userId = getEffectiveUserId();
  if (!sessionId) return;

  const deletedSet = getDeletedSessionsSet(userId);
  if (deletedSet.has(sessionId)) return;

  const cacheKey = getSessionMsgsStorageKey(userId, sessionId);
  try {
    if (!messages || messages.length === 0) {
      localStorage.removeItem(cacheKey);
    } else {
      if (userId) {
        localStorage.setItem(cacheKey, JSON.stringify(messages));
      }
    }
  } catch (e) {}
}

// Create a new session for current user
export function createNewSession(customTitle?: string): ChatSession {
  const userId = getEffectiveUserId();
  const newId = `session_${Date.now()}`;
  const newSession: ChatSession = {
    id: newId,
    title: customTitle || 'محادثة جديدة',
    desc: 'محادثة ذكاء اصطناعي جديدة',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    hasMedia: false,
    isPinned: false
  };

  if (userId) {
    unmarkSessionDeleted(userId, newId);
    const currentList = getCachedSessions();
    const updatedList = [newSession, ...currentList.filter(s => s.id !== newId)];
    localStorage.setItem(getSessionsStorageKey(userId), JSON.stringify(updatedList));
    setActiveSessionId(newId);
    window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: updatedList } }));
  } else {
    // For Guests: transient in-memory only
    localStorage.setItem(getActiveChatStorageKey(null), newId);
  }

  return newSession;
}

// Update / Touch a session with latest user & assistant message
export async function touchSession(
  sessionId: string, 
  userPrompt: string, 
  aiResponse: string, 
  mediaInfo?: { mediaUrl?: string; mediaType?: string; isVideo?: boolean; thumbnailUrl?: string }
): Promise<void> {
  const userId = getEffectiveUserId();
  // GUESTS: NEVER save or touch sessions
  if (!userId) return;

  const deletedSet = getDeletedSessionsSet(userId);
  if (deletedSet.has(sessionId)) return;

  const isVid = mediaInfo?.isVideo || mediaInfo?.mediaType?.startsWith('video/');
  const isImg = !isVid && (mediaInfo?.mediaType?.startsWith('image/') || !!mediaInfo?.thumbnailUrl);
  const isAud = !isVid && !isImg && mediaInfo?.mediaType?.startsWith('audio/');

  let currentList = getCachedSessions();
  let session = currentList.find(s => s.id === sessionId);

  const cleanPrompt = userPrompt.trim();
  const autoTitle = cleanPrompt.length > 35 ? cleanPrompt.substring(0, 35) + '...' : (cleanPrompt || 'محادثة جديدة');

  if (!session) {
    session = {
      id: sessionId,
      title: autoTitle,
      desc: aiResponse.length > 80 ? aiResponse.substring(0, 80) + '...' : aiResponse,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 2,
      hasMedia: Boolean(mediaInfo?.mediaUrl || isVid || isImg || isAud),
      lastMediaType: isVid ? 'video' : isImg ? 'image' : isAud ? 'audio' : 'text',
      lastMediaThumbnail: mediaInfo?.thumbnailUrl || (isImg ? mediaInfo?.mediaUrl : undefined),
      isPinned: false
    };
    currentList = [session, ...currentList];
  } else {
    // If title was default, give it a smart title from first prompt
    const shouldUpdateTitle = !session.title || session.title === 'محادثة جديدة' || session.title === 'New Chat' || session.title === 'محادثة ذكاء اصطناعي';
    session = {
      ...session,
      title: shouldUpdateTitle ? autoTitle : session.title,
      desc: aiResponse.length > 80 ? aiResponse.substring(0, 80) + '...' : aiResponse,
      updatedAt: new Date().toISOString(),
      messageCount: (session.messageCount || 0) + 2,
      hasMedia: session.hasMedia || Boolean(mediaInfo?.mediaUrl || isVid || isImg || isAud),
      lastMediaType: isVid ? 'video' : isImg ? 'image' : isAud ? 'audio' : session.lastMediaType || 'text',
      lastMediaThumbnail: mediaInfo?.thumbnailUrl || (isImg ? mediaInfo?.mediaUrl : session.lastMediaThumbnail)
    };
    currentList = [session, ...currentList.filter(s => s.id !== sessionId)];
  }

  // Sort pinned first
  currentList.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  localStorage.setItem(getSessionsStorageKey(userId), JSON.stringify(currentList));
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: currentList } }));
}

// Rename session
export async function renameSession(sessionId: string, newTitle: string): Promise<boolean> {
  const userId = getEffectiveUserId();
  if (!userId) return false;

  const trimmed = newTitle.trim();
  if (!trimmed) return false;

  const currentList = getCachedSessions();
  const updatedList = currentList.map(s => s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s);
  localStorage.setItem(getSessionsStorageKey(userId), JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: updatedList } }));

  await renameChatSession(userId, sessionId, trimmed);
  return true;
}

// Toggle Pin
export async function togglePinSession(sessionId: string, currentPinState?: boolean): Promise<boolean> {
  const userId = getEffectiveUserId();
  if (!userId) return false;

  const newPin = !currentPinState;
  const currentList = getCachedSessions();
  const updatedList = currentList.map(s => s.id === sessionId ? { ...s, isPinned: newPin, updatedAt: new Date().toISOString() } : s);
  
  updatedList.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  localStorage.setItem(getSessionsStorageKey(userId), JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: updatedList } }));

  await togglePinChatSession(userId, sessionId, newPin);
  return newPin;
}

// Delete session cleanly and reliably
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const userId = getEffectiveUserId();

  // 1. Mark as deleted locally to avoid ghost revival
  markSessionDeletedLocally(userId, sessionId);
  markSessionDeletedLocally(null, sessionId);

  // 2. Remove from cached sessions list immediately
  const userKey = getSessionsStorageKey(userId);
  const guestKey = getSessionsStorageKey(null);

  const currentList = getCachedSessions();
  const updatedList = currentList.filter(s => s?.id !== sessionId);

  if (userId) {
    localStorage.setItem(userKey, JSON.stringify(updatedList));
    localStorage.removeItem(getSessionMsgsStorageKey(userId, sessionId));
  }
  localStorage.setItem(guestKey, JSON.stringify(updatedList));
  localStorage.removeItem(getSessionMsgsStorageKey(null, sessionId));

  // 3. Broadcast updated sessions list to UI
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: updatedList } }));

  // 4. Check active chat status
  const activeKey = getActiveChatStorageKey(userId);
  const guestActiveKey = getActiveChatStorageKey(null);
  const wasActive = localStorage.getItem(activeKey) === sessionId || localStorage.getItem(guestActiveKey) === sessionId;

  if (wasActive) {
    if (updatedList.length > 0) {
      setActiveSessionId(updatedList[0].id);
    } else {
      const newS = createNewSession();
      setActiveSessionId(newS.id);
    }
  }

  // 5. Delete in Firestore & Server if user logged in
  if (userId) {
    await deleteChatOrMessage(userId, sessionId);
  }
}

// Clear all sessions for this specific user or guest
export async function clearAllSessions(): Promise<void> {
  const userId = getEffectiveUserId();
  const currentList = getCachedSessions();
  
  // Mark all current sessions deleted
  currentList.forEach(s => {
    if (s?.id) {
      markSessionDeletedLocally(userId, s.id);
      markSessionDeletedLocally(null, s.id);
    }
  });

  if (userId) {
    localStorage.removeItem(getSessionsStorageKey(userId));
  }
  localStorage.removeItem(getSessionsStorageKey(null));
  
  // Clean all session messages keys from localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('thoth_user_msgs_') || key.startsWith('thoth_guest_msgs_'))) {
      localStorage.removeItem(key);
    }
  }

  // Delete from Firestore
  if (userId) {
    const deletePromises = currentList.map(session => deleteChatOrMessage(userId, session.id).catch(() => {}));
    await Promise.all(deletePromises);
  }

  const newS = createNewSession();
  setActiveSessionId(newS.id);
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: [newS] } }));
}

// Cleanup function on logout to isolate accounts completely
export function handleUserLogoutCleanup(): void {
  window.dispatchEvent(new CustomEvent('thoth_sessions_list_updated', { detail: { sessions: [] } }));
  window.dispatchEvent(new CustomEvent('thoth_active_session_changed', { detail: { sessionId: `guest_${Date.now()}` } }));
}
