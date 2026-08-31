/* برنامج الفلاح — Service Worker
   الاستراتيجية (مُحدَّثة لتسريع الفتح): "اعرض المخزَّن فوراً، وحدِّثه بصمت في الخلفية"
   (Stale-While-Revalidate) لصفحة HTML الرئيسية. بدل انتظار رحلة كاملة للشبكة قبل
   إظهار أي شيء (وهو ما كان يُبطئ الفتح فعلياً خصوصاً بشبكة ضعيفة في مواقع العمل)،
   يُعرض المحتوى المحفوظ محلياً على الفور، ثم تُجلب أي نسخة أحدث من الإنترنت في
   الخلفية لتكون جاهزة في المرة القادمة. للملفات الثابتة (أيقونات/مانيفست) تبقى
   نفس استراتيجية "التخزين المؤقت أولاً" لأنها نادراً ما تتغيّر. */

const CACHE_NAME = 'alfallah-cache-v7';
const CORE_ASSETS = [
  './alfallah.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkUpdate = fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return resp;
          })
          .catch(() => cached || caches.match('./alfallah.html'));
        // إن وُجدت نسخة محفوظة، اعرضها فوراً بلا أي انتظار للشبكة
        return cached || networkUpdate;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      });
    })
  );
});
