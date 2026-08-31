/**
 * THOTH Notification Service — W3C Web Push + VAPID (official web standard)
 *
 * The previous implementation used Firebase Cloud Messaging (FCM) JS SDK.
 * That path was broken at three levels:
 *   1. The messaging client initialization line was accidentally commented out.
 *   2. No VAPID key was ever passed to getToken() → token registration always failed.
 *   3. The server had no Firebase Admin credentials at all, so it could never send.
 *
 * This implementation uses the official W3C Push API directly (the exact protocol
 * FCM is built on top of): the browser subscribes with our own VAPID public key,
 * and the server delivers pushes with the standard `web-push` protocol using the
 * matching private key. No Google console credentials are required anywhere.
 *
 * Backwards compatibility: subscriptions are still stored in the same Firestore
 * collection users/{uid}/notificationTokens/{id} with additive fields
 * (subscription / endpoint / platform: 'web-push'), so nothing else in the
 * database changes.
 */

import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

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

/**
 * VAPID public key (applicationServerKey). This key is PUBLIC by design —
 * the private counterpart lives only on the THOTH server as an env variable.
 */
export const VAPID_PUBLIC_KEY = 'BF_5Ju24577yMXIdXX3w7JVD6GQa_GxIgCghh3PD1ha6ByHTHV6xzafJnV6mS284lgDo2rc9nc42YQioftFGCTQ';

export const NOTIFICATION_SW_PATH = '/firebase-messaging-sw.js';

/** Track an in-flight permission request so concurrent callers don't double-prompt. */
let pendingPermissionRequest: Promise<boolean> | null = null;

/** Guard so the automatic post-login attempt runs at most once per page load. */
let autoAttemptedThisLoad = false;

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Stable per-endpoint document id (FNV-1a, hex) so re-subscribing updates in place. */
function endpointDocId(endpoint: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < endpoint.length; i += 1) {
    hash ^= endpoint.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return 'wp' + hash.toString(16).padStart(8, '0');
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

export function currentNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register the notification Service Worker (idempotent).
 */
export async function registerNotificationSW(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('هذا المتصفح لا يدعم Service Workers.');
  }
  const reg = await navigator.serviceWorker.register(NOTIFICATION_SW_PATH);
  // Wait until the SW is active so push events are guaranteed to be delivered.
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Request browser notification permission + create (or reuse) the Web Push
 * subscription + persist it to Firestore. Safe to call multiple times.
 */
export async function requestNotificationPermission(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (!notificationsSupported()) {
      return { success: false, error: 'المتصفح الحالي لا يدعم إشعارات Push.' };
    }

    // Reuse an in-flight request (e.g. auto attempt + banner click racing).
    if (!pendingPermissionRequest) {
      pendingPermissionRequest = (async () => {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      })();
    }
    const granted = await pendingPermissionRequest;
    pendingPermissionRequest = null;

    if (!granted) {
      return { success: false, error: 'لم يتم منح إذن الإشعارات من قبل المستخدم.' };
    }

    // Register the service worker that will receive push events.
    const swReg = await registerNotificationSW();

    // Reuse the existing subscription only when it already uses our VAPID key.
    let sub = await swReg.pushManager.getSubscription();
    const ourKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const matchesOurKey = (key: BufferSource | null | undefined): boolean => {
      if (!key) return false;
      const bytes = key instanceof ArrayBuffer ? new Uint8Array(key) : new Uint8Array(key as ArrayBufferView as Uint8Array);
      return bytes.length === ourKey.length && bytes.every((b, i) => b === ourKey[i]);
    };

    if (!sub || !matchesOurKey(sub.options?.applicationServerKey)) {
      // Subscribe (or resubscribe) with our applicationServerKey.
      if (sub) {
        try { await sub.unsubscribe(); } catch { /* ignore */ }
      }
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: ourKey as unknown as BufferSource
      });
    }

    if (!sub) {
      return { success: false, error: 'تعذر إنشاء اشتراك الإشعارات في المتصفح.' };
    }

    const subscriptionJson = JSON.stringify(sub.toJSON());
    // Persist the subscription (same collection as before — additive only).
    await saveNotificationToken(userId, subscriptionJson);

    return { success: true, token: subscriptionJson };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء تفعيل الإشعارات.' };
  }
}

/**
 * Automatic post-login sync: runs once per page load, never throws, never
 * shows a prompt. If permission is already granted, silently refreshes the
 * push subscription in Firestore. If permission was never asked ('default'),
 * the caller should show its own UI (banner) to collect the user gesture.
 */
export async function autoRequestNotificationsAfterLogin(userId: string): Promise<void> {
  if (autoAttemptedThisLoad) return;
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  autoAttemptedThisLoad = true;
  try {
    await requestNotificationPermission(userId);
  } catch (e) {
    console.warn('Auto notification subscription refresh skipped:', e);
  }
}

/**
 * Save the push subscription to Firestore under users/{userId}/notificationTokens/{id}
 * (same collection the FCM flow used — the rest of the app/database is untouched).
 */
export async function saveNotificationToken(userId: string, subscriptionJson: string) {
  if (!userId || !subscriptionJson) return;

  let endpoint = '';
  try {
    endpoint = JSON.parse(subscriptionJson)?.endpoint || '';
  } catch { /* keep empty */ }
  const tokenId = endpoint ? endpointDocId(endpoint) : endpointDocId(subscriptionJson.slice(0, 120));
  const path = `users/${userId}/notificationTokens/${tokenId}`;

  try {
    await setDoc(doc(db, 'users', userId, 'notificationTokens', tokenId), {
      token: subscriptionJson,        // kept for legacy readers
      subscription: subscriptionJson, // canonical Web Push subscription
      endpoint,
      platform: 'web-push',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      notificationsEnabled: true,
      userId
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/** Remove a stored subscription document (e.g. push service returned 410 Gone). */
export async function deleteNotificationToken(userId: string, subscriptionJson: string) {
  if (!userId || !subscriptionJson) return;
  let endpoint = '';
  try {
    endpoint = JSON.parse(subscriptionJson)?.endpoint || '';
  } catch { /* keep empty */ }
  const tokenId = endpoint ? endpointDocId(endpoint) : endpointDocId(subscriptionJson.slice(0, 120));
  const path = `users/${userId}/notificationTokens/${tokenId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'notificationTokens', tokenId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
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
 * Foreground message bridge: the service worker receives the push and, when the
 * app is visible, forwards it to the page as a {type:'THOTH_PUSH'} message.
 * Returns an unsubscribe function (same contract as before).
 */
export function listenToForegroundMessages(onMessageCallback: (payload: any) => void) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== 'THOTH_PUSH') return;
    console.log('Foreground push received:', data.payload);
    onMessageCallback(data.payload);
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

/**
 * Trigger a test push through the server. `token` is the Web Push subscription JSON.
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
