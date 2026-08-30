import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface PlanDetails {
  id: 'guest' | 'free' | 'basic' | 'pro' | 'max' | 'ultra';
  name: string;
  price: string;
  priceEgp: number;
  priceUsd: number;
  chatLimit: number;
  searchLimit: number;
  voiceLimitSec: number; // in seconds
  translateLimit: number;
  audioSummaryLimit?: number;
  textSummaryLimit?: number;
  badge?: string;
  features: string[];
}

export let SUBSCRIPTION_PLANS: Record<string, PlanDetails> = {
  guest: {
    id: 'guest',
    name: 'زائر',
    price: 'مجاناً',
    priceEgp: 0,
    priceUsd: 0,
    chatLimit: 5,
    searchLimit: 1,
    voiceLimitSec: 120, // 2 mins
    translateLimit: 5,
    audioSummaryLimit: 0,
    textSummaryLimit: 0,
    badge: 'زائر',
    features: ['تجربة أولية للدردشة السريعة', 'تفكير عميق واستنتاج تجريبي', 'بحث ويب مباشر', 'محادثة صوتية حية THOTH Live', 'يتطلب التسجيل للوصول الكامل']
  },
  free: {
    id: 'free',
    name: 'الباقة المجانية',
    price: 'مجاناً',
    priceEgp: 0,
    priceUsd: 0,
    chatLimit: 20,
    searchLimit: 3,
    voiceLimitSec: 300, // 5 mins
    translateLimit: 15,
    audioSummaryLimit: 1,
    textSummaryLimit: 2,
    badge: 'الأساسية',
    features: [
      'ردود سريعة وذكية للمحادثات اليومية',
      'تفكير عميق وتحليل منطقي متقدم',
      'بحث مباشر في الويب مع مصادر حية',
      'ملخص صوتي وبودكاست ذكي يومي',
      'تلخيص نصي للمستندات والروابط',
      'حوار صوتي تفاعلي THOTH Live'
    ]
  },
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية',
    price: '99 £ / شهرياً',
    priceEgp: 99,
    priceUsd: 5,
    chatLimit: 60,
    searchLimit: 5,
    voiceLimitSec: 1200, // 20 mins
    translateLimit: 50,
    audioSummaryLimit: 2,
    textSummaryLimit: 5,
    badge: 'شائعة',
    features: [
      'محادثات ذكية موسعة وسريعة',
      'تفكير عميق وتحليل مسائل مطور',
      'بحث ويب حي مع روابط موثوقة',
      'ملخصات صوتية وبودكاست ذكي متعدد',
      'تلخيص شامل للمستندات والملفات',
      'جلسات حوار صوتي THOTH Live أطول'
    ]
  },
  pro: {
    id: 'pro',
    name: 'الباقة الاحترافية (THOTH Pro)',
    price: '199 £ / شهرياً',
    priceEgp: 199,
    priceUsd: 10,
    chatLimit: 180,
    searchLimit: 12,
    voiceLimitSec: 2400, // 40 mins
    translateLimit: 150,
    audioSummaryLimit: 5,
    textSummaryLimit: 15,
    badge: 'الأكثر اختياراً',
    features: [
      'محادثات ذكية سريعة ومكثفة',
      'تفكير واستنتاج منطقي دقيق وموسع',
      'بحث واستقصاء ويب فوري ومحدث',
      'استوديو متقدم للبودكاست الصوتي',
      'تلخيص احترافي لكافة المستندات',
      'حوار صوتي THOTH Live عالي الدقة',
      'تكامل كامل مع THOTH Workspace'
    ]
  },
  max: {
    id: 'max',
    name: 'الباقة القصوى (Max)',
    price: '399 £ / شهرياً',
    priceEgp: 399,
    priceUsd: 20,
    chatLimit: 400,
    searchLimit: 25,
    voiceLimitSec: 4800, // 80 mins
    translateLimit: 400,
    audioSummaryLimit: 10,
    textSummaryLimit: 30,
    badge: 'الأفضل للأعمال',
    features: [
      'سعة محادثات ضخمة واستجابة فائقة',
      'تحليل منطقي وتفكير عميق مكثف',
      'بحث ويب تحليلي متقدم وشامل',
      'ملخصات صوتية وبودكاست متعددة',
      'معالجة وتحليل متقدم للملفات الكبيرة',
      'حوار صوتي حي مطول وأولوية معالجة',
      'دعم فني وأولوية قصوى'
    ]
  },
  ultra: {
    id: 'ultra',
    name: 'الباقة الفائقة (THOTH Ultra)',
    price: '599 £ / شهرياً',
    priceEgp: 599,
    priceUsd: 30,
    chatLimit: 1000,
    searchLimit: 50,
    voiceLimitSec: 10800, // 180 mins
    translateLimit: 1000,
    audioSummaryLimit: 25,
    textSummaryLimit: 60,
    badge: 'سعة فائقة',
    features: [
      'أعلى سعة للردود السريعة ومحادثات الذكاء الاصطناعي',
      'استنتاج عميق وتفكير تحليلي بأعلى دقة',
      'بحث واستقصاء ويب فوري مستمر',
      'استوديو صوتي وبودكاست متكامل',
      'تحليل واستيعاب شامل لكافة المستندات',
      'حوار صوتي مستمر THOTH Live بأعلى جودة',
      'أولوية مطلقة على سيرفرات المعالجة الفائقة'
    ]
  }
};

const getTodayDateString = (): string => {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 3);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export interface UsageData {
  chatUsed: number;
  searchUsed: number;
  voiceSecUsed: number;
  translateUsed: number;
  date: string;
}

export function getTodayUsage(): UsageData {
  const today = getTodayDateString();
  const storedDate = localStorage.getItem('thoth_usage_date');

  if (storedDate !== today) {
    // Reset daily counter
    localStorage.setItem('thoth_usage_date', today);
    localStorage.setItem('thoth_usage_chat', '0');
    localStorage.setItem('thoth_usage_search', '0');
    localStorage.setItem('thoth_usage_voice_sec', '0');
    localStorage.setItem('thoth_usage_translate', '0');
    return { chatUsed: 0, searchUsed: 0, voiceSecUsed: 0, translateUsed: 0, date: today };
  }

  return {
    chatUsed: parseInt(localStorage.getItem('thoth_usage_chat') || '0', 10),
    searchUsed: parseInt(localStorage.getItem('thoth_usage_search') || '0', 10),
    voiceSecUsed: parseInt(localStorage.getItem('thoth_usage_voice_sec') || '0', 10),
    translateUsed: parseInt(localStorage.getItem('thoth_usage_translate') || '0', 10),
    date: today
  };
}

export function getUserPlanId(): string {
  const plan = (localStorage.getItem('thoth_user_plan') || 'guest').toLowerCase().trim();
  if (SUBSCRIPTION_PLANS[plan]) return plan;
  const matchKey = Object.keys(SUBSCRIPTION_PLANS).find(k => k.toLowerCase() === plan);
  if (matchKey) return matchKey;
  return 'free';
}

export function getUserPlan(): PlanDetails {
  const planId = getUserPlanId();
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS['free'] || SUBSCRIPTION_PLANS['guest'] || DEFAULT_SUBSCRIPTION_PLANS['free'];
}

export function checkUsageLimit(type: 'chat' | 'search' | 'voice' | 'translate'): {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  planName: string;
} {
  const usage = getTodayUsage();
  const plan = getUserPlan();

  let used = 0;
  let limit = 0;

  if (type === 'chat') {
    used = usage.chatUsed;
    limit = plan.chatLimit;
  } else if (type === 'search') {
    used = usage.searchUsed;
    limit = plan.searchLimit;
  } else if (type === 'voice') {
    used = usage.voiceSecUsed;
    limit = plan.voiceLimitSec;
  } else if (type === 'translate') {
    used = usage.translateUsed;
    limit = plan.translateLimit;
  }

  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return {
    allowed,
    used,
    limit,
    remaining,
    planName: plan.name
  };
}

export function incrementUsage(type: 'chat' | 'search' | 'voice' | 'translate', amount: number = 1): UsageData {
  const usage = getTodayUsage();
  let newChat = usage.chatUsed;
  let newSearch = usage.searchUsed;
  let newVoice = usage.voiceSecUsed;
  let newTranslate = usage.translateUsed;

  if (type === 'chat') newChat += amount;
  if (type === 'search') newSearch += amount;
  if (type === 'voice') newVoice += amount;
  if (type === 'translate') newTranslate += amount;

  localStorage.setItem('thoth_usage_chat', newChat.toString());
  localStorage.setItem('thoth_usage_search', newSearch.toString());
  localStorage.setItem('thoth_usage_voice_sec', newVoice.toString());
  localStorage.setItem('thoth_usage_translate', newTranslate.toString());

  // Notify components
  window.dispatchEvent(new Event('thoth_usage_updated'));

  // Sync to firestore if user is logged in
  if (auth.currentUser) {
    try {
      setDoc(doc(db, 'users', auth.currentUser.uid), {
        dailyUsage: {
          date: usage.date,
          chatUsed: newChat,
          searchUsed: newSearch,
          voiceSecUsed: newVoice,
          translateUsed: newTranslate
        }
      }, { merge: true }).catch(() => {});
    } catch (e) {
      // Ignore background sync errors
    }
  }

  return {
    chatUsed: newChat,
    searchUsed: newSearch,
    voiceSecUsed: newVoice,
    translateUsed: newTranslate,
    date: usage.date
  };
}

export async function upgradeUserPlan(planId: 'free' | 'basic' | 'pro' | 'max' | 'ultra' | 'guest'): Promise<void> {
  localStorage.setItem('thoth_user_plan', planId);
  window.dispatchEvent(new Event('thoth_plan_updated'));

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        plan: planId,
        subscriptionStatus: 'active',
        planUpdatedAt: new Date().toISOString()
      }, { merge: true });
      await syncUsageFromServer();
    } catch (e) {
      console.error('Error syncing plan upgrade to Firestore:', e);
    }
  }
}

export async function cancelUserSubscription(): Promise<void> {
  localStorage.setItem('thoth_user_plan', 'free');
  window.dispatchEvent(new Event('thoth_plan_updated'));

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        plan: 'free',
        autoRenew: false,
        subscriptionStatus: 'cancelled',
        cancelledAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error cancelling subscription in Firestore:', e);
    }
  }
}

export async function redeemPromoCode(code: string): Promise<{ success: boolean; message: string; planId?: string }> {
  try {
    const userId = auth.currentUser ? auth.currentUser.uid : 'guest';
    const userEmail = auth.currentUser?.email || localStorage.getItem('app-user-email') || 'guest@thoth.ai';
    const res = await fetch('/api/user/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, code })
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
    if (res.ok && data.success) {
      if (data.planId) {
        localStorage.setItem('thoth_user_plan', data.planId);
        window.dispatchEvent(new Event('thoth_plan_updated'));
      }
      return { success: true, message: data.message, planId: data.planId };
    }
    return { success: false, message: data.error || 'كود التفعيل غير صحيح أو منتهي الصلاحية.' };
  } catch (err: any) {
    console.error('Error redeeming promo code:', err);
    return { success: false, message: 'حدث خطأ أثناء تفعيل الكود.' };
  }
}

// ===========================================
// CHAT STORAGE CLIENT HELPERS & FORMATTERS
// ===========================================

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface StorageUsageResult {
  userId: string;
  plan: string;
  planName: string;
  storageUsed: number;
  storageLimit: number;
  percentage: number;
  chatCount: number;
  messageCount: number;
  isAlmostFull: boolean;
  isFull: boolean;
}

export async function fetchUserStorageUsage(userId: string): Promise<StorageUsageResult | null> {
  try {
    const res = await fetch(`/api/chat/storage-usage?userId=${encodeURIComponent(userId)}`);
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) return null;
    return await res.json().catch(() => null);
  } catch (err) {
    console.error('Error fetching user storage usage:', err);
    return null;
  }
}

export interface SaveMessageResult {
  success: boolean;
  code?: string;
  error?: string;
  messageId?: string;
  storageUsed?: number;
  storageLimit?: number;
  plan?: string;
  planName?: string;
  percentage?: number;
}

export interface ChatMessageRecord {
  id: string;
  senderId?: string;
  chatId?: string;
  userId?: string;
  role?: string;
  isUser?: boolean;
  content?: string;
  text?: string;
  timestamp?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  mediaType?: string;
  fileType?: string;
  mediaSize?: number;
  mediaName?: string;
  fileName?: string;
  attachments?: any[];
  images?: any[];
  sources?: any[];
  relatedSources?: any[];
  modelUsed?: string;
}

export async function saveChatMessageWithStorageCheck(
  userId: string,
  chatId: string,
  chatTitle: string,
  message: ChatMessageRecord
): Promise<SaveMessageResult> {
  try {
    const res = await fetch('/api/chat/save-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, chatId, chatTitle, message })
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => ({ success: false, error: 'استجابة غير صالحة من السيرفر' })) : { success: false, error: 'تعذر الاتصال بالسيرفر' };
    return data;
  } catch (err: any) {
    console.error('Error saving message with storage check:', err);
    return { success: false, error: 'فشل الاتصال بالسيرفر لحفظ الرسالة.' };
  }
}

export async function deleteChatOrMessage(userId: string, chatId: string, messageId?: string): Promise<{ success: boolean; message?: string; storageUsed?: number }> {
  if (!userId || !chatId) return { success: false };

  // 1. Direct client-side Firestore deletion for instant synchronization
  try {
    if (messageId) {
      const msgRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
      await deleteDoc(msgRef);
    } else {
      const chatRef = doc(db, 'users', userId, 'chats', chatId);
      // Clean messages subcollection
      try {
        const msgsSnap = await getDocs(collection(db, 'users', userId, 'chats', chatId, 'messages'));
        const deletePromises = msgsSnap.docs.map(mDoc => deleteDoc(doc(db, 'users', userId, 'chats', chatId, 'messages', mDoc.id)).catch(() => {}));
        await Promise.all(deletePromises);
      } catch (subErr) {
        console.warn('Subcollection delete warning:', subErr);
      }
      await deleteDoc(chatRef);
    }
  } catch (directErr) {
    console.warn('Direct Firestore delete warning:', directErr);
  }

  // 2. Server-side deletion for storage recalculation and database cleanup
  try {
    const res = await fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, chatId, messageId })
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({ success: true }));
      return data;
    }
    return { success: true };
  } catch (err) {
    console.warn('Server delete notification warning:', err);
    return { success: true };
  }
}

export async function getUserChatSessions(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const res = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(userId)}`);
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({ sessions: [] }));
      if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        return data.sessions;
      }
    }
  } catch (err) {
    // Network/API fetch issue - will fallback to direct Firestore
  }

  // Direct Firestore fallback
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'chats'));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    return list;
  } catch (dbErr) {
    return [];
  }
}

export async function getChatSessionMessages(userId: string, chatId: string): Promise<any[]> {
  if (!userId || !chatId) return [];
  try {
    const res = await fetch(`/api/chat/messages?userId=${encodeURIComponent(userId)}&chatId=${encodeURIComponent(chatId)}`);
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({ messages: [] }));
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        return data.messages;
      }
    }
  } catch (err) {
    // Server fetch error, fallback to direct Firestore
  }

  // Direct Firestore Fallback
  try {
    const msgsSnap = await getDocs(collection(db, 'users', userId, 'chats', chatId, 'messages'));
    const messages: any[] = [];
    msgsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const mType = data.messageType || (data.imageUrl ? 'image' : data.videoUrl ? 'video' : data.audioUrl ? 'audio' : data.fileUrl ? 'file' : 'text');
      const imgUrl = data.imageUrl || (mType === 'image' ? (data.mediaUrl || null) : null);
      const imagesList = (Array.isArray(data.images) && data.images.length > 0)
        ? data.images
        : (imgUrl ? [{ url: imgUrl, description: data.mediaName || 'صورة' }] : []);

      messages.push({
        id: data.id || docSnap.id,
        text: data.text || data.content || '',
        isUser: data.isUser !== undefined ? data.isUser : (data.role === 'user'),
        role: data.role || (data.isUser ? 'user' : 'model'),
        time: data.time || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'سابقاً'),
        timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
        messageType: mType,
        mediaUrl: data.mediaUrl || imgUrl || data.videoUrl || data.audioUrl || data.fileUrl || null,
        imageUrl: imgUrl,
        videoUrl: data.videoUrl || (mType === 'video' ? (data.mediaUrl || null) : null),
        audioUrl: data.audioUrl || (mType === 'audio' ? (data.mediaUrl || null) : null),
        thumbnailUrl: data.thumbnailUrl || null,
        fileUrl: data.fileUrl || (mType === 'file' ? (data.mediaUrl || null) : null),
        fileName: data.mediaName || data.fileName || null,
        fileType: data.mediaType || data.fileType || null,
        attachments: data.attachments || [],
        images: imagesList,
        sources: data.sources || [],
        relatedSources: data.relatedSources || [],
        modelUsed: data.modelUsed || null
      });
    });
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return messages;
  } catch (dbErr) {
    return [];
  }
}

export async function renameChatSession(userId: string, chatId: string, title: string): Promise<{ success: boolean; title?: string }> {
  try {
    const res = await fetch('/api/chat/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, chatId, title })
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      return await res.json().catch(() => ({ success: false }));
    }
    return { success: false };
  } catch (err) {
    console.error('Error renaming chat session:', err);
    return { success: false };
  }
}

export async function togglePinChatSession(userId: string, chatId: string, isPinned: boolean): Promise<{ success: boolean; isPinned?: boolean }> {
  try {
    const res = await fetch('/api/chat/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, chatId, isPinned })
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      return await res.json().catch(() => ({ success: false }));
    }
    return { success: false };
  } catch (err) {
    console.error('Error toggling chat pin:', err);
    return { success: false };
  }
}


export async function syncUsageFromServer(explicitUserId?: string): Promise<void> {
  try {
    const userId = explicitUserId || (auth.currentUser ? auth.currentUser.uid : 'guest');
    const res = await fetch(`/api/user/usage-status?userId=${encodeURIComponent(userId)}`).catch((err) => {
      console.warn("Usage status fetch warning:", err);
      return null;
    });
    if (!res) return;
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      if (data && data.features) {
        if (data.features.normalChat?.used !== undefined) localStorage.setItem('thoth_usage_chat', data.features.normalChat.used.toString());
        if (data.features.webSearch?.used !== undefined) localStorage.setItem('thoth_usage_search', data.features.webSearch.used.toString());
        if (data.features.liveVoiceSec?.used !== undefined) localStorage.setItem('thoth_usage_voice_sec', data.features.liveVoiceSec.used.toString());
        if (data.features.translation?.used !== undefined) localStorage.setItem('thoth_usage_translate', data.features.translation.used.toString());
        if (data.planId && userId !== 'guest') {
          localStorage.setItem('thoth_user_plan', data.planId.toLowerCase());
          window.dispatchEvent(new Event('thoth_plan_updated'));
        }
        
        const today = getTodayDateString();
        localStorage.setItem('thoth_usage_date', today);
        
        window.dispatchEvent(new Event('thoth_usage_updated'));
      }
    }
  } catch (err) {
    console.warn("Could not sync usage status with server:", err);
  }
}

export const DEFAULT_SUBSCRIPTION_PLANS: Record<string, PlanDetails> = { ...SUBSCRIPTION_PLANS };

export function updateLocalPlansFromObject(plansData: Record<string, any>) {
  if (!plansData || typeof plansData !== 'object') return;
  const mappedPlans: Record<string, PlanDetails> = { ...DEFAULT_SUBSCRIPTION_PLANS };

  const allKeys = Array.from(new Set([...Object.keys(DEFAULT_SUBSCRIPTION_PLANS), ...Object.keys(plansData)]));

  for (const key of allKeys) {
    const defaultPlan = DEFAULT_SUBSCRIPTION_PLANS[key];
    const planData = plansData[key] || {};

    const rawEgp = typeof planData.priceEgp === 'number' ? planData.priceEgp : Number(planData.priceEgp);
    const egpPrice = (!isNaN(rawEgp) && rawEgp > 0) 
      ? rawEgp 
      : (key === 'guest' || key === 'free' ? 0 : (defaultPlan?.priceEgp || (key === 'basic' ? 99 : key === 'pro' ? 199 : key === 'max' ? 399 : key === 'ultra' ? 599 : 99)));

    const rawUsd = typeof planData.priceUsd === 'number' ? planData.priceUsd : Number(planData.priceUsd);
    const usdPrice = (!isNaN(rawUsd) && rawUsd > 0) 
      ? rawUsd 
      : (key === 'guest' || key === 'free' ? 0 : (defaultPlan?.priceUsd || (key === 'basic' ? 5 : key === 'pro' ? 10 : key === 'max' ? 20 : key === 'ultra' ? 30 : 5)));

    mappedPlans[key] = {
      id: (planData.id || key) as any,
      name: planData.name || defaultPlan?.name || key,
      price: planData.price || defaultPlan?.price || (egpPrice > 0 ? `${egpPrice} £ / شهرياً` : 'مجاناً'),
      priceEgp: egpPrice,
      priceUsd: usdPrice,
      chatLimit: typeof planData.normalChat === 'number' ? planData.normalChat : (planData.chatLimit ?? defaultPlan?.chatLimit ?? 0),
      searchLimit: typeof planData.webSearch === 'number' ? planData.webSearch : (planData.searchLimit ?? defaultPlan?.searchLimit ?? 0),
      voiceLimitSec: typeof planData.liveVoiceSec === 'number' ? planData.liveVoiceSec : (planData.voiceLimitSec ?? defaultPlan?.voiceLimitSec ?? 0),
      translateLimit: typeof planData.translation === 'number' ? planData.translation : (planData.translateLimit ?? defaultPlan?.translateLimit ?? 0),
      badge: planData.badge || defaultPlan?.badge || '',
      features: (Array.isArray(planData.features) && planData.features.length > 0) 
        ? planData.features 
        : (typeof planData.features === 'string' && planData.features.length > 0 
            ? planData.features.split(',').map((s: string) => s.trim()).filter(Boolean) 
            : (defaultPlan?.features || []))
    };
  }

  SUBSCRIPTION_PLANS = mappedPlans;
  window.dispatchEvent(new Event('thoth_plans_loaded'));
}

let isPlansListenerAttached = false;

export async function initSubscriptionPlans(): Promise<void> {
  try {
    const res = await fetch('/api/public/subscription-plans').catch((err) => {
      console.warn("Dynamic plans fetch warning:", err);
      return null;
    });
    if (res) {
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.plans) {
          updateLocalPlansFromObject(data.plans);
        }
      }
    }

    if (!isPlansListenerAttached && db) {
      try {
        isPlansListenerAttached = true;
        onSnapshot(doc(db, 'systemConfig', 'usagePlans'), (snap) => {
          if (snap.exists()) {
            updateLocalPlansFromObject(snap.data());
          }
        }, (err) => {
          console.warn("Firestore plans snapshot warning:", err);
        });
      } catch (e) {
        console.warn("Error setting up plans listener:", e);
      }
    }
  } catch(e) {
    console.warn("Failed to fetch dynamic subscription plans", e);
  }
}
