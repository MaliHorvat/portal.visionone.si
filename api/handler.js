// Vercel: vse zahteve /api/*, /print/* in /health preusmeri sem (glej vercel.json → rewrites).
import { handle } from '../src/handler.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // Vercel ob rewrite poda izvirno pot v parametru __p (npr. __p=api/customers/5)
  const u = new URL(req.url, 'http://localhost');
  const p = u.searchParams.get('__p');
  if (p !== null) {
    u.searchParams.delete('__p');
    const qs = u.searchParams.toString();
    req.url = '/' + p.replace(/^\/+/, '') + (qs ? `?${qs}` : '');
  }
  return handle(req, res);
}
