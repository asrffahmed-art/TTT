import { getMessaging as getFirebaseMessaging, getToken as getFirebaseToken, onMessage as onFirebaseMessage } from 'firebase/messaging';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, app } from '../lib/firebase';

export interface UserNotificationSettings {
  dailyEnabled: boolean;
  time: string;
  topics: string[];
  updatedAt?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  dailyEnabled: true,
  time: '09:00',
  topics: ['AI', 'Technology', 'Programming', 'Gaming', 'Business', 'World']
};

export const TOPIC_LABELS: Record<string, string> = {
  'AI': '🤖 الذكاء الاصطناعي',
  'Technology': '📱 التكنولوجيا والتقنية',
  'Programming': '💻 البرمجة والتطوير',
  'Gaming': '🎮 الألعاب الإلكترونية',
  'Business': '💼 المال والأعمال',
  'World': '🌍 أحداث العالم'
};

let messagingInstance: any = null;

export function getMessagingClient() {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

  if (!messagingInstance) {
    try {
      // Use imported app      messagingInstance = getFirebaseMessaging(app);
    } catch (e) {
      console.warn('FCM messaging not supported in current environment:', e);
    }
  }
  return messagingInstance;
}

/**
 * Register Service Worker and Request FCM Notification Permission
 */
export async function requestNotificationPermission(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (!('Notification' in window)) {
      return { success: false, error: 'المتصفح الحالي لا يدعم إشعارات Push.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'لم يتم منح إذن الإشعارات من قبل المستخدم.' };
    }

    // Register service worker
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.error('Service worker registration failed:', swErr);
      return { success: false, error: 'فشل تسجيل Service Worker الخاص بالإشعارات.' };
    }

    // Get FCM instance
    const messaging = getMessagingClient();
    if (!messaging) {
      return { success: false, error: 'تعذر تهيئة Firebase Messaging Client.' };
    }

    // Obtain FCM token
    const token = await getFirebaseToken(messaging, {
      serviceWorkerRegistration: swReg
    });

    if (!token) {
      return { success: false, error: 'لم يتم الحصول على FCM Registration Token.' };
    }

    // Save Token to Firestore safely
    await saveNotificationToken(userId, token);

    return { success: true, token };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء تفعيل الإشعارات.' };
  }
}

/**
 * Save FCM Token to Firestore under users/{userId}/notificationTokens/{tokenId}
 */
export async function saveNotificationToken(userId: string, token: string) {
  if (!userId || !token) return;
  const tokenId = token.substring(0, 32); // sanitize ID for document path
  const path = `users/${userId}/notificationTokens/${tokenId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'notificationTokens', tokenId), {
      token,
      platform: 'web',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      notificationsEnabled: true,
      userId
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Get User Notification Settings
 */
export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
  if (!userId) return DEFAULT_NOTIFICATION_SETTINGS;
  const path = `users/${userId}/notificationSettings/settings`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'notificationSettings', 'settings'));
    if (snap.exists()) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...snap.data() } as UserNotificationSettings;
    }
  } catch (err) {
    console.warn('Error fetching user notification settings:', err);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Save User Notification Settings
 */
export async function saveUserNotificationSettings(userId: string, settings: Partial<UserNotificationSettings>) {
  if (!userId) return;
  const path = `users/${userId}/notificationSettings/settings`;
  try {
    await setDoc(doc(db, 'users', userId, 'notificationSettings', 'settings'), {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Attach Foreground Message Listener
 */
export function listenToForegroundMessages(onMessageCallback: (payload: any) => void) {
  const messaging = getMessagingClient();
  if (!messaging) return () => {};

  return onFirebaseMessage(messaging, (payload) => {
    console.log('Foreground FCM Message received:', payload);
    onMessageCallback(payload);
  });
}

/**
 * Trigger Test FCM Push Notification via Server
 */
export async function triggerTestPushNotification(userId: string, token: string) {
  const res = await fetch('/api/daily-notification/test-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, token })
  });
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json().catch(() => ({ success: false }));
  }
  return { success: false };
}

/**
 * Trigger Server Daily Notification Engine (Centralized Tavily + Gemini)
 */
export async function triggerDailyNotificationEngine() {
  const res = await fetch('/api/daily-notification/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manualTrigger: true })
  });
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json().catch(() => ({ success: false }));
  }
  return { success: false };
}
