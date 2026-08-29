/* برنامج الفلاح — Service Worker
   الاستراتيجية: للصفحة الرئيسية (HTML) نحاول الشبكة أولاً لضمان وصول آخر تحديث،
   ونرجع للنسخة المخزّنة فقط عند انعدام الاتصال. للملفات الثابتة (أيقونات/مانيفست)
   نستخدم التخزين المؤقت أولاً لأنها نادراً ما تتغيّر. هذا يمنح التطبيق قابلية العمل
   دون إنترنت مع تفادي مشكلة تلقّي نسخة قديمة عالقة في الذاكرة المؤقتة. */

const CACHE_NAME = 'alfallah-cache-v1';
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
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./alfallah.html')))
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
