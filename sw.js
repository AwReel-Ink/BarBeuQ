const CACHE = 'barbeuq-v1.1';
const ASSETS = [
  './','./index.html','./manifest.json',
  './sync-maison.js',
  './css/main.css','./css/themes.css',
  './js/app.js','./js/db.js','./js/theme.js',
  './js/modules/calculator.js','./js/modules/comparator.js',
  './js/modules/wood.js','./js/modules/meat.js',
  './js/modules/guide.js','./js/modules/donnees.js',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', e => {
  // cache: 'reload' : on prend les fichiers sur le réseau, pas une vieille copie du cache HTTP
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('barbeuq-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Seuls les fichiers de l'appli passent par le cache : les échanges avec le
  // serveur maison (autre adresse, POST…) vont directement au réseau.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp => {
      if (resp.ok && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return resp;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
