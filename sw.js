const CACHE = 'barbeuq-v1';
const ASSETS = [
  './','./index.html','./manifest.json',
  './css/main.css','./css/themes.css',
  './js/app.js','./js/db.js','./js/theme.js',
  './js/modules/calculator.js','./js/modules/comparator.js',
  './js/modules/carnet.js','./js/modules/wood.js',
  './js/modules/meat.js','./js/modules/guide.js',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const copy = resp.clone();
      if (e.request.method === 'GET' && resp.ok) {
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
