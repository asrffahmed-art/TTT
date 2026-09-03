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

  // [BROADCAST-CLICK] Carry the message text + kind into the notification's
  // data so notificationclick can hand the broadcast to the page (the message
  // then appears inside the chat as a THOTH message the user can reply to).
  const _notifId = (payload.data && payload.data.notificationId) || '';
  const _isBroadcast = _notifId.indexOf('broadcast_') === 0;
  const _msgTitle = title || '';
  const _msgBody = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';

  const options = {
    body: _msgBody || 'أهم حدث اليوم في مجالات اهتمامك — اضغط للتفاصيل.',
    icon: (payload.notification && payload.notification.icon) || DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: _notifId || ('thoth-push-' + Date.now()),
    renotify: false,
    data: {
      url: (payload.data && payload.data.deepLink) || '/',
      notificationId: _notifId,
      eventId: (payload.data && payload.data.eventId) || '',
      kind: _isBroadcast ? 'broadcast' : 'general',
      msgTitle: _msgTitle,
      msgBody: _msgBody,
      category: (payload.data && payload.data.category) || ''
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

  const nd = (event.notification && event.notification.data) || {};
  const targetUrl = nd.url || '/';

  // [BROADCAST-CLICK] Broadcast campaigns: instead of a plain navigate (which
  // did nothing useful for the user), focus/open the app and post the message
  // content to the page so it appears INSIDE the chat as a THOTH message the
  // user can ask follow-up questions about. Non-broadcast notifications keep
  // the original deep-link routing below, byte for byte.
  if (nd.kind === 'broadcast') {
    const broadcastMsg = {
      type: 'THOTH_OPEN_BROADCAST',
      payload: {
        title: nd.msgTitle || event.notification.title || '',
        body: nd.msgBody || event.notification.body || '',
        category: nd.category || '',
        notificationId: nd.notificationId || ''
      }
    };

    const postToClient = (client) => {
      try { client.postMessage(broadcastMsg); } catch (e) { /* ignore */ }
      if ('focus' in client) return client.focus();
      return Promise.resolve();
    };

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'postMessage' in client) {
            return postToClient(client);
          }
        }
        // No open window yet: open the app, then poll until the page is up
        // (so the React listener is mounted) before posting the broadcast.
        if (clients.openWindow) {
          return clients.openWindow('/').then((win) => new Promise((resolve) => {
            let tries = 0;
            const poll = setInterval(() => {
              tries++;
              clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
                const fresh = list.find((c) => c.url && 'postMessage' in c);
                if (fresh) {
                  clearInterval(poll);
                  // Small settle delay so the page finishes mounting listeners.
                  setTimeout(() => { postToClient(fresh); resolve(); }, 1200);
                } else if (tries > 20) {
                  clearInterval(poll);
                  resolve();
                }
              }).catch(() => {});
            }, 500);
          }));
        }
        return undefined;
      })
    );
    return;
  }

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
