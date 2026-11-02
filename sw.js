// لمّة · عامل الخدمة: يشغّل التطبيق بدون نت، ويستقبل الإشعارات
const VERSION = 'lamma-v5';
const SHELL = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/app.js', './js/calls.js', './js/callui.js', './js/games.js', './js/gamedata.js', './js/sound.js', './js/crypto.js', './js/config.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('lamma-v') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // ملفات التطبيق: من النت أولاً (عشان التحديثات توصل فوراً)، وإذا ما فيه نت من المحفوظ
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(VERSION); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./index.html'));
      }
    })());
    return;
  }
  // المكتبات والخطوط: من المحفوظ أولاً
  if (/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { const c = await caches.open(VERSION + '-cdn'); c.put(req, res.clone()); }
      return res;
    })());
  }
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'لمّة', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const active = wins.some((w) => w.visibilityState === 'visible' && w.focused !== false);
    // لازم يطلع إشعار لكل رسالة (الآيفون يوقف الإشعارات إذا ما طلع)
    await self.registration.showNotification(d.title || 'لمّة', {
      body: d.body || 'رسالة جديدة',
      tag: d.tag || 'lamma',
      renotify: true,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: d.call ? [500, 300, 500, 300, 500] : [120, 60, 120],
      requireInteraction: !!d.call,
      data: { chat: d.chat },
    });
    if (navigator.setAppBadge && !active) { try { await navigator.setAppBadge(); } catch (err) { /* ignore */ } }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const chat = e.notification.data && e.notification.data.chat;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const scope = self.registration.scope;
    const w = wins.find((x) => x.url.startsWith(scope)) || wins[0];
    if (w) {
      await w.focus();
      if (chat) w.postMessage({ open: chat });
      return;
    }
    await self.clients.openWindow(scope + (chat ? '?chat=' + encodeURIComponent(chat) : ''));
  })());
});
