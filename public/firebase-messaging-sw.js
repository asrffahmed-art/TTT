// Firebase Messaging Service Worker for THOTH Daily Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCi_OGkMMTDuryrNVJdvn9RLgL9oDNjMAU",
  authDomain: "gen-lang-client-0920354136.firebaseapp.com",
  projectId: "gen-lang-client-0920354136",
  storageBucket: "gen-lang-client-0920354136.firebasestorage.app",
  messagingSenderId: "67294751494",
  appId: "1:67294751494:web:52796cd4cf6b1c45c38c87"
});

const messaging = firebase.messaging();

// Background Push Notification Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || '🔔 THOTH Daily';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'أهم حدث اليوم في مجالات اهتمامك — اضغط للتفاصيل.',
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    tag: payload.data?.notificationId || 'thoth-daily-notification',
    data: {
      url: payload.data?.deepLink || payload.fcmOptions?.link || '/?dailyId=' + (payload.data?.notificationId || ''),
      notificationId: payload.data?.notificationId || '',
      eventId: payload.data?.eventId || ''
    }
  };

  self.registration.showNotification(title, options);
});

// Notification Click Handler - Deep Link Routing
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
