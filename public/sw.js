// VisionOne Field – predpomnjenje aplikacije (deluje tudi ob slabem signalu)
const CACHE = 'v1field-5';
const SHELL = ['/', '/index.html', '/app.js', '/pages-docs.js', '/pages-more.js', '/plan.js', '/pages-inquiries.js', '/field.css', '/lib/core.js', '/lib/base.css', '/favicon-32x32.png', '/brand/mark.png', '/brand/wordmark.png', '/manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/') || u.pathname.startsWith('/print/')) return;
  // najprej omrežje, ob izpadu predpomnilnik
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
