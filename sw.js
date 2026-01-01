/* SerCucTech HUB — Service Worker (iOS/Safari friendly) */
const VERSION = 'sercuctech-hub-v3';
const CORE = [
  '/',                 // navigazione
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Install: pre-cache core + update più veloce
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

// Activate: pulisci cache vecchie + prendi controllo subito
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === VERSION ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// Fetch: network-first per HTML (Safari update), cache-first per assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignora richieste non http(s)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Solo GET
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html') || url.pathname.endsWith('.html') || req.mode === 'navigate';

  if (isHTML) {
    // iOS: network-first per evitare pagine vecchie
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(VERSION);
        // fallback: prova la richiesta, altrimenti index.html
        return (await cache.match(req)) || (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Asset: cache-first con fallback network
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
/* icon-bump Thu Jan  1 11:48:03 CET 2026 */
/* ASSET-BUMP Thu Jan  1 21:05:04 CET 2026 */
