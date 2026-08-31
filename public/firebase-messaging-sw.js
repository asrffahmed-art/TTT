// THOTH Push Service Worker — official W3C Push API (VAPID)
// Receives standard web push messages sent by the THOTH server via the
// `web-push` protocol. Payload JSON shape:
// {
//   notification: { title, body, icon?, badge? },
//   data: { deepLink?, notificationId?, eventId?, category? }
// }

const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/icon-192-maskable.png';

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

  console.log('[thoth-sw] Push received:', payload);

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
        return self.registration.showNotification(title, options);
      }
      return undefined;
    }).catch((err) => {
      console.error('[thoth-sw] push handling failed:', err);
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
