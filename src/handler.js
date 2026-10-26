// Skupni obdelovalec zahtev: uporablja ga lokalni strežnik (server.js) in Vercel (api/handler.js).
import './tz.js';
import { ready } from './db.js';
import { HttpError, sendJson, serveStatic } from './http-util.js';
import { api, identify, printRoute, VERSION } from './api.js';
import './init.js';
import { corsFor } from './inquiries.js';

export async function handle(req, res, { webDir } = {}) {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (url.pathname === '/health') {
      await ready();
      return sendJson(res, 200, { ok: true, version: VERSION });
    }
    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/public/')) {
      corsFor(req, res);
      res.writeHead(204); return res.end();
    }
    await ready();
    req.user = await identify(req);
    if (url.pathname.startsWith('/api/')) {
      const m = api.match(req.method, url.pathname);
      if (!m) throw new HttpError(404, 'Ni najdeno');
      req.params = m.params;
      for (const h of m.handlers) { await h(req, res); if (res.headersSent || res.writableEnded) break; }
      return;
    }
    if (url.pathname.startsWith('/print/')) return await printRoute(req, res, url.pathname, url.searchParams);
    if (webDir) {
      if (serveStatic(req, res, webDir, url.pathname)) return;
      if (serveStatic(req, res, webDir, '/index.html')) return;
    }
    throw new HttpError(404, 'Ni najdeno');
  } catch (e) {
    if ((e.status || 500) >= 500) console.error('[napaka]', req.method, url.pathname, e);
    if (!res.headersSent) sendJson(res, e.status || 500, { error: e.message || 'Napaka strežnika' }); else res.end();
  }
}
