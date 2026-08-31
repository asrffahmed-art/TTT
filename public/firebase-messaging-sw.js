// THOTH Push Service Worker — official W3C Push API (VAPID)
// Receives standard web push messages sent by the THOTH server via the
// `web-push` protocol. Payload JSON shape:
// {
//   notification: { title, body, icon?, badge? },
//   data: { deepLink?, notificationId?, eventId?, category? }
// }

const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/icon-192-maskable.png';

// [iOS-DIAG] Platform tag for diagnostics. On iPhone/iPad, push events are
// ONLY delivered to the Home-Screen web app (iOS 16.4+) — this log proves
// when WebKit wakes this SW and hands us the APNs-backed push.
const _ua = (self.navigator && self.navigator.userAgent) || '';
const _isIOS = /iPhone|iPad|iPod/.test(_ua) || (/Macintosh/.test(_ua) && (self.navigator.maxTouchPoints || 0) > 1);
const _log = (msg, detail) => {
  const prefix = _isIOS ? '[iOS Notifications] [thoth-sw]' : '[thoth-sw]';
  if (detail !== undefined) console.log(prefix, msg, detail);
  else console.log(prefix, msg);
};

// Background Push Handler
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    // Non-JSON push (e.g. plain text) — wrap it gracefully
    const text = event.data ? event.data.text() : '';
    payload = { notification: { title: '🔔 THOTH', body: text } };
  }

  _log('Push received — app state:', _isIOS ? (payload.notification && payload.notification.title ? 'title="' + payload.notification.title + '"' : 'payload ok') : 'ok');

  const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || '🔔 THOTH Daily';
  const options = {
    body: (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || 'أهم حدث اليوم في مجالات اهتمامك — اضغط للتفاصيل.',
    icon: (payload.notification && payload.notification.icon) || DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: (payload.data && payload.data.notificationId) || ('thoth-push-' + Date.now()),
    renotify: false,
    data: {
      url: (payload.data && payload.data.deepLink) || '/',
      notificationId: (payload.data && payload.data.notificationId) || '',
      eventId: (payload.data && payload.data.eventId) || ''
    }
  };

  // When the app is open and visible, forward the message to the page
  // (in-app toast) instead of duplicating a system notification.
  const forwardToVisibleClient = () => clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.visibilityState === 'visible' && 'postMessage' in client) {
        client.postMessage({ type: 'THOTH_PUSH', payload });
        return true;
      }
    }
    return false;
  });

  event.waitUntil(
    forwardToVisibleClient().then((forwarded) => {
      if (!forwarded) {
        if (_isIOS) _log('No visible client → showing system notification (APNs delivery OK)');
        return self.registration.showNotification(title, options);
      }
      if (_isIOS) _log('App visible → forwarded to page as in-app toast');
      return undefined;
    }).catch((err) => {
      _log('push handling failed — falling back to showNotification:', err);
      return self.registration.showNotification(title, options);
    })
  );
});

// Notification Click — Deep Link Routing
self.addEventListener('notificationclick', (event) => {
  console.log('[thoth-sw] Notification clicked:', event.notification);
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          try { client.navigate(targetUrl); } catch (e) { /* ignore */ }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
