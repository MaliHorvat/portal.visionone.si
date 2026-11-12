// VisionOne portal – service worker (namestljiva aplikacija za iPhone, Windows in macOS)
// Lupina aplikacije je shranjena na napravi, zato se portal odpre takoj in tudi brez povezave.
// Podatki (API) gredo vedno najprej na strežnik; ob izpadu povezave se prikažejo zadnji shranjeni.
const VERSION = 'v1portal-8';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = 'v1portal-api';
const SHELL = [
  '/', '/index.html', '/app.js', '/pages-docs.js', '/pages-more.js', '/plan.js', '/pages-inquiries.js', '/pwa.js',
  '/field.css', '/lib/core.js', '/lib/base.css', '/manifest.webmanifest',
  '/favicon-32x32.png', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png',
  '/brand/mark.png', '/brand/wordmark.png',
];
// teh podatkov ne shranjujemo na napravo
const NO_CACHE_API = [/^\/api\/auth\/(?!me$)/, /^\/api\/backup/, /^\/api\/export\//, /^\/api\/files\//, /^\/api\/import\//];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== API_CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CLEAR_DATA') e.waitUntil(caches.delete(API_CACHE));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/print/')) return;

  // podatki: najprej omrežje, ob izpadu zadnji shranjeni odgovor
  if (u.pathname.startsWith('/api/')) {
    if (NO_CACHE_API.some(re => re.test(u.pathname))) return;
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
          const copy = res.clone();
          caches.open(API_CACHE).then(c => c.put(req, copy));
        }
        return res;
      } catch (err) {
        const hit = await caches.match(req, { cacheName: API_CACHE });
        if (hit) {
          const h = new Headers(hit.headers); h.set('X-V1-Offline', '1');
          return new Response(await hit.blob(), { status: 200, headers: h });
        }
        return new Response(JSON.stringify({ error: 'Ni povezave z internetom. Ti podatki še niso shranjeni na napravi.' }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
    })());
    return;
  }

  // odpiranje aplikacije: omrežje, ob izpadu shranjena lupina
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const pre = await e.preloadResponse;
        if (pre) return pre;
        return await fetch(req);
      } catch {
        return (await caches.match('/index.html', { cacheName: SHELL_CACHE })) || Response.error();
      }
    })());
    return;
  }

  // datoteke aplikacije: najprej omrežje (da so vse datoteke iz iste različice), ob počasni ali
  // prekinjeni povezavi shranjena kopija
  e.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    const slow = new Promise(r => setTimeout(r, 3000, null));
    try {
      const res = await Promise.race([net, slow]);
      if (res) return res;
      return (await cache.match(req)) || (await net);
    } catch {
      return (await cache.match(req)) || Response.error();
    }
  })());
});
