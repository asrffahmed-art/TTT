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

// ============================================================================
// [iOS-DIAG] iOS / iPadOS (WebKit) support detection — ADDITIVE ONLY.
// Non-iOS platforms (Android / Windows / macOS Chrome…) get isIOS === false
// and every existing code path keeps its exact previous behavior.
// ----------------------------------------------------------------------------
// WebKit platform rules that explain "iPhone gets no notifications":
//   • The Push API is exposed ONLY to web apps added to the Home Screen
//     (standalone mode) — never to regular Safari tabs, on any iOS version.
//   • Web push itself shipped in iOS 16.4 — older versions cannot subscribe
//     even from the Home Screen.
//   • Notification.requestPermission() only shows the system prompt while
//     handling a real user tap — "await something, then ask" silently no-ops.
// ============================================================================

export interface IOSNotificationSupport {
  isIOS: boolean;
  iosVersion: { major: number; minor: number } | null;
  standalone: boolean;
  pushAPIAvailable: boolean;
  pushCapable: boolean;
  needsHomeScreenInstall: boolean;
  needsIOSUpdate: boolean;
  reason: 'not-ios' | 'ios-outdated' | 'needs-home-screen' | 'unknown' | 'ok';
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1); // iPadOS 13+ desktop UA
}

export function getIOSVersion(): { major: number; minor: number } | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (!/iPad|iPhone|iPod/.test(ua)) return null; // Mac-masquerade UA carries no iPadOS version
  const m = ua.match(/OS (\d+)[._](\d+)(?:[._](\d+))?/);
  return m ? { major: parseInt(m[1], 10), minor: parseInt(m[2], 10) } : null;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const iosStandalone = (navigator as any).standalone === true;
  const mqStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(iosStandalone || mqStandalone);
}

/**
 * Detect the exact iOS notification state so the UI can guide the user
 * instead of failing with a dead-end "not supported" error.
 * PushManager availability is the ground truth; the version check only
 * lets us EXPLAIN the failure ("update iOS") when the API is missing.
 */
export function getIOSNotificationSupport(): IOSNotificationSupport {
  const standalone = isStandalonePWA();
  if (!isIOSDevice()) {
    return {
      isIOS: false,
      iosVersion: null,
      standalone,
      pushAPIAvailable: notificationsSupported(),
      pushCapable: notificationsSupported(),
      needsHomeScreenInstall: false,
      needsIOSUpdate: false,
      reason: 'not-ios'
    };
  }
  const iosVersion = getIOSVersion();
  const pushAPIAvailable = typeof window !== 'undefined'
    && 'PushManager' in window
    && 'serviceWorker' in navigator;
  // WebKit shipped web push in iOS 16.4. If the UA carries no iOS version
  // (iPadOS masquerading as macOS) we cannot blame the version — PushManager
  // availability is the ground truth for capability, the version only explains.
  const versionKnown = iosVersion !== null;
  const versionOK = versionKnown
    ? (iosVersion.major > 16 || (iosVersion.major === 16 && iosVersion.minor >= 4))
    : true;
  const pushCapable = pushAPIAvailable && standalone && versionOK;
  let reason: IOSNotificationSupport['reason'] = 'ok';
  if (!pushCapable) {
    if (versionKnown && !versionOK) reason = 'ios-outdated';
    else if (!standalone) reason = 'needs-home-screen';
    else reason = 'unknown';
  }
  return {
    isIOS: true,
    iosVersion,
    standalone,
    pushAPIAvailable,
    pushCapable,
    // A Safari-tab user must be guided to install even though PushManager is
    // absent *because* of the tab — so this does not require pushAPIAvailable.
    needsHomeScreenInstall: versionOK && !standalone,
    needsIOSUpdate: versionKnown && !versionOK,
    reason
  };
}

/** [iOS-DIAG] iOS-only console logging — visible in Safari inspector console. */
export function logIOS(step: string, detail?: any): void {
  if (!isIOSDevice()) return;
  try {
    if (detail !== undefined) console.log(`[iOS Notifications] ${step}:`, detail);
    else console.log(`[iOS Notifications] ${step}`);
  } catch { /* diagnostics must never throw */ }
}

/** Hostname of a push endpoint (web.push.apple.com ⇒ APNs-backed delivery). */
function safeEndpointHost(endpoint: string): string {
  try { return new URL(endpoint).hostname; } catch { return 'unknown-host'; }
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

    // [iOS-DIAG] Full-chain diagnostics (iOS-only console logs).
    logIOS('Permission status', Notification.permission);
    const iosState = getIOSNotificationSupport();
    if (iosState.isIOS) {
      logIOS('Device state', `iOS ${iosState.iosVersion ? iosState.iosVersion.major + '.' + iosState.iosVersion.minor : '?'} · standalone=${iosState.standalone} · pushAPI=${iosState.pushAPIAvailable} · reason=${iosState.reason}`);
    }

    // Reuse an in-flight request (e.g. auto attempt + banner click racing).
    if (!pendingPermissionRequest) {
      logIOS('Permission requested', 'yes — from user gesture');
      pendingPermissionRequest = (async () => {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      })();
    }
    const granted = await pendingPermissionRequest;
    pendingPermissionRequest = null;
    logIOS('Permission result', granted ? 'granted' : (Notification.permission || 'denied'));

    if (!granted) {
      logIOS('Flow stopped at: permission not granted');
      return { success: false, error: 'لم يتم منح إذن الإشعارات من قبل المستخدم.' };
    }

    // Register the service worker that will receive push events.
    logIOS('SW registration started', NOTIFICATION_SW_PATH);
    const swReg = await registerNotificationSW();
    logIOS('SW registration successful', swReg.scope);

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
    // [iOS-DIAG] On iPhone the endpoint is web.push.apple.com — this IS the
    // APNs-backed delivery path (WebKit maps the web subscription to APNs
    // internally; no Apple Developer certificate is needed for web push).
    const _epHost = safeEndpointHost(sub.endpoint);
    logIOS('Push subscription endpoint', _epHost === 'web.push.apple.com' ? `${_epHost} (APNs-backed delivery)` : _epHost);
    // Persist the subscription (same collection as before — additive only).
    await saveNotificationToken(userId, subscriptionJson);
    logIOS('Backend token registration', `users/${userId}/notificationTokens — saved`);

    return { success: true, token: subscriptionJson };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    logIOS('Flow error', err?.message || String(err));
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
    logIOS('Notification received (foreground)', data.payload?.notification?.title || '');
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
