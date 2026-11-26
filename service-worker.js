/* goodnews – Service Worker
 * - Offline: App-Shell wird gecacht (Network-first, Cache als Offline-Fallback)
 * - Lokale Benachrichtigungen: tägliche Erinnerung über Periodic Background Sync (wo unterstützt)
 * Es werden keine Daten an einen eigenen Server gesendet.
 */
const CACHE = 'goodnews-v4';
const SHELL = [
  './',
  './index.html',
  './datenschutz.html',
  './manifest.json',
  './data.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nur eigene Dateien cachen – externe Anfragen (Proxys, Übersetzung) gehen direkt ins Netz
  if (url.origin !== self.location.origin) return;

  // Network-first: immer die aktuelle Version laden, offline auf den Cache zurückfallen
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((cached) => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

/* ---------- IndexedDB (gleiche Datenbank wie die App) ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('goodnews', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('news')) db.createObjectStore('news', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('translations')) db.createObjectStore('translations', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function getSetting(db, key, fallback) {
  return new Promise((resolve) => {
    const r = db.transaction('settings').objectStore('settings').get(key);
    r.onsuccess = () => resolve(r.result === undefined ? fallback : r.result.value);
    r.onerror = () => resolve(fallback);
  });
}
async function setSetting(db, key, value) {
  return new Promise((resolve) => {
    const t = db.transaction('settings', 'readwrite');
    t.objectStore('settings').put({ key, value });
    t.oncomplete = resolve; t.onerror = resolve;
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Tägliche Erinnerung ---------- */
async function dailyCheck() {
  const db = await openDB();
  const notify = await getSetting(db, 'notify', { enabled: false, time: '07:30' });
  if (!notify.enabled || self.Notification?.permission !== 'granted') return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm < notify.time) return;
  if ((await getSetting(db, 'lastNotified', '')) === todayStr()) return;

  // Ist die App gerade geöffnet, übernimmt sie Suche + Benachrichtigung selbst
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.some((c) => c.visibilityState === 'visible')) {
    clients.forEach((c) => c.postMessage({ type: 'refresh' }));
    return;
  }
  await setSetting(db, 'lastNotified', todayStr());
  await self.registration.showNotification('goodnews ☀️', {
    body: 'Deine täglichen guten Nachrichten sind bereit. Tippe zum Öffnen!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'goodnews-daily',
    data: { url: './' },
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'goodnews-daily') event.waitUntil(dailyCheck());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
          c.postMessage({ type: 'refresh' });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
