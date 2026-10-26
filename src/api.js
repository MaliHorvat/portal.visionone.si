// VisionOne Field – REST API
import crypto from 'node:crypto';
import { Router, HttpError, readJson, sendJson, sendBuffer, parseCookies, httpRequest, clientIp } from './http-util.js';
import { q, insert, update, pick, getSetting, setSetting, encrypt, decrypt, SECRET, transaction, putBlob, getBlob, deleteBlob, DIALECT } from './db.js';
import { company, calcTotals, nextNumber, reference, DOC_TYPES, STATUS, renderDocument, renderHandover, renderNotice, setDecrypt, EQUIP_TYPES } from './docs.js';

setDecrypt(decrypt);
export const api = new Router();
export const VERSION = '1.1.0';
const COOKIE = 'v1f_session';
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: process.env.TZ || 'Europe/Ljubljana' });
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const addMonths = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };

// ---------- avtentikacija ----------
export function hashPassword(pw) { const salt = crypto.randomBytes(16); return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(String(pw), salt, 64).toString('hex')}`; }
function verifyPassword(pw, stored) {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  return crypto.timingSafeEqual(crypto.scryptSync(String(pw), Buffer.from(salt, 'hex'), 64), Buffer.from(hash, 'hex'));
}
function sign(payload) { const b = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${b}.${crypto.createHmac('sha256', SECRET).update(b).digest('base64url')}`; }
function verify(tok) {
  if (!tok?.includes('.')) return null;
  const [b, s] = tok.split('.');
  const e = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() / 1000 ? p : null; } catch { return null; }
}
export async function identify(req) {
  const p = verify(parseCookies(req)[COOKIE]);
  if (!p) return null;
  return await q.get('SELECT id, username, full_name, email, phone, role FROM users WHERE id=? AND enabled=1', p.uid) || null;
}
const auth = req => { if (!req.user) throw new HttpError(401, 'Prijava je potrebna'); };
const admin = req => { auth(req); if (req.user.role !== 'admin') throw new HttpError(403, 'To lahko stori samo skrbnik'); };
const log = async (req, action, target = '') => insert('activity', { username: req.user?.username || '-', action, target: String(target) });
const attempts = new Map();

api.post('/api/auth/login', async (req, res) => {
  const b = await readJson(req);
  const key = `${clientIp(req)}|${b.username}`;
  const a = attempts.get(key);
  if (a && a.n >= 8 && Date.now() - a.t < 900e3) throw new HttpError(429, 'Preveč neuspešnih poskusov. Poskusite čez 15 minut.');
  const u = await q.get('SELECT * FROM users WHERE username=? AND enabled=1', String(b.username || ''));
  if (!u || !verifyPassword(b.password, u.password_hash)) {
    attempts.set(key, a && Date.now() - a.t < 900e3 ? { n: a.n + 1, t: a.t } : { n: 1, t: Date.now() });
    throw new HttpError(401, 'Napačno uporabniško ime ali geslo');
  }
  attempts.delete(key);
  const days = 30;
  res.setHeader('Set-Cookie', `${COOKIE}=${sign({ uid: u.id, exp: Math.floor(Date.now() / 1000) + days * 86400 })}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
  sendJson(res, 200, { ok: true });
});
api.post('/api/auth/logout', async (req, res) => { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`); sendJson(res, 200, { ok: true }); });
api.get('/api/auth/me', auth, async (req, res) => sendJson(res, 200, { ...req.user, company: (await company()).name, version: VERSION }));
api.post('/api/auth/password', auth, async (req, res) => {
  const b = await readJson(req);
  const u = await q.get('SELECT * FROM users WHERE id=?', req.user.id);
  if (!verifyPassword(b.old_password, u.password_hash)) throw new HttpError(400, 'Trenutno geslo ni pravilno');
  if (String(b.new_password || '').length < 8) throw new HttpError(400, 'Novo geslo mora imeti vsaj 8 znakov');
  await update('users', u.id, { password_hash: hashPassword(b.new_password) });
  sendJson(res, 200, { ok: true });
});

// ---------- nadzorna plošča ----------
api.get('/api/dashboard', auth, async (req, res) => {
  const t = today();
  const now = Math.floor(Date.now() / 1000);
  const dayStart = Math.floor(new Date(t + 'T00:00:00').getTime() / 1000);
  const y = new Date().getFullYear(), m = t.slice(0, 7);
  const sites = await q.all('SELECT s.*, c.name customer_name FROM sites s JOIN customers c ON c.id=s.customer_id WHERE s.maintenance_months > 0');
  const servicesDue = sites.map(s => ({ ...s, next_service: s.last_service ? addMonths(s.last_service, s.maintenance_months) : null }))
    .filter(s => s.next_service && s.next_service <= addDays(t, 30)).sort((a, b) => a.next_service.localeCompare(b.next_service))
    .map(s => ({ id: s.id, name: s.name, customer_id: s.customer_id, customer_name: s.customer_name, next_service: s.next_service, overdue: s.next_service < t }));
  sendJson(res, 200, {
    today: await q.all(`SELECT a.*, c.name customer_name, s.name site_name, s.address site_address, s.city site_city FROM appointments a LEFT JOIN customers c ON c.id=a.customer_id LEFT JOIN sites s ON s.id=a.site_id WHERE a.start>=? AND a.start<? ORDER BY a.start`, dayStart, dayStart + 86400),
    upcoming: await q.all(`SELECT a.*, c.name customer_name, s.name site_name FROM appointments a LEFT JOIN customers c ON c.id=a.customer_id LEFT JOIN sites s ON s.id=a.site_id WHERE a.start>=? AND a.start<? AND a.done=0 ORDER BY a.start LIMIT 10`, dayStart + 86400, dayStart + 8 * 86400),
    open_workorders: await q.all(`SELECT d.id, d.number, d.status, d.date, d.title, c.name customer_name FROM documents d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.type='workorder' AND d.status!='done' ORDER BY d.date DESC LIMIT 15`),
    overdue_invoices: await q.all(`SELECT d.id, d.number, d.due_date, d.total, d.paid, c.name customer_name FROM documents d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.type='invoice' AND d.status IN ('issued','partial') AND d.due_date < ? ORDER BY d.due_date`, t),
    open_quotes: await q.all(`SELECT d.id, d.number, d.date, d.total, d.status, c.name customer_name FROM documents d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.type='quote' AND d.status IN ('draft','sent') ORDER BY d.date DESC LIMIT 10`),
    services_due: servicesDue,
    warranties: await q.all(`SELECT e.id, e.type, e.name, e.model, e.warranty_until, s.name site_name, s.id site_id, c.name customer_name FROM equipment e JOIN sites s ON s.id=e.site_id JOIN customers c ON c.id=s.customer_id WHERE e.warranty_until IS NOT NULL AND e.warranty_until BETWEEN ? AND ? ORDER BY e.warranty_until LIMIT 20`, t, addDays(t, 60)),
    low_stock: await q.all('SELECT id, name, stock, min_stock, unit FROM products WHERE active=1 AND track_stock=1 AND min_stock > 0 AND stock <= min_stock ORDER BY name LIMIT 20'),
    revenue: {
      month: (await q.get(`SELECT COALESCE(SUM(total_net),0) v FROM documents WHERE type='invoice' AND status NOT IN ('draft','cancelled') AND substr(date,1,7)=?`, m)).v,
      year: (await q.get(`SELECT COALESCE(SUM(total_net),0) v FROM documents WHERE type='invoice' AND status NOT IN ('draft','cancelled') AND year=?`, y)).v,
      unpaid: (await q.get(`SELECT COALESCE(SUM(total-paid),0) v FROM documents WHERE type='invoice' AND status IN ('issued','partial')`)).v,
    },
    counts: { customers: (await q.get('SELECT COUNT(*) n FROM customers')).n, sites: (await q.get('SELECT COUNT(*) n FROM sites')).n, equipment: (await q.get('SELECT COUNT(*) n FROM equipment')).n },
    now,
  });
});

// ---------- podjetje in uporabniki ----------
api.get('/api/company', auth, async (req, res) => sendJson(res, 200, await company()));
api.put('/api/company', admin, async (req, res) => {
  const b = await readJson(req);
  const allowed = ['name', 'address', 'post', 'city', 'tax_id', 'reg_no', 'vat_payer', 'iban', 'bic', 'bank', 'email', 'phone', 'web', 'logo', 'payment_days', 'quote_valid_days', 'default_vat', 'hourly_rate', 'invoice_format', 'quote_format', 'workorder_format', 'footer', 'quote_note', 'invoice_note', 'purpose_code'];
  const cur = await getSetting('company', {}) || {};
  for (const k of allowed) if (b[k] !== undefined) cur[k] = b[k];
  if (cur.logo && cur.logo.length > 1.5e6) throw new HttpError(400, 'Logotip je prevelik (največ ~1 MB)');
  await setSetting('company', cur);
  await log(req, 'nastavitve_podjetja');
  sendJson(res, 200, { ok: true });
});
api.get('/api/users', admin, async (req, res) => sendJson(res, 200, await q.all('SELECT id, username, full_name, email, phone, role, enabled, created_at FROM users ORDER BY username')));
api.post('/api/users', admin, async (req, res) => {
  const b = await readJson(req);
  if (!b.username || String(b.password || '').length < 8) throw new HttpError(400, 'Uporabniško ime in geslo (vsaj 8 znakov) sta obvezna');
  if (await q.get('SELECT 1 FROM users WHERE username=?', b.username)) throw new HttpError(400, 'Uporabnik že obstaja');
  sendJson(res, 200, { id: await insert('users', { username: b.username, full_name: b.full_name, email: b.email, phone: b.phone, role: b.role === 'admin' ? 'admin' : 'tech', password_hash: hashPassword(b.password) }) });
});
api.put('/api/users/:id', admin, async (req, res) => {
  const b = await readJson(req);
  const d = pick(b, ['full_name', 'email', 'phone', 'role', 'enabled']);
  if (b.password) { if (String(b.password).length < 8) throw new HttpError(400, 'Geslo mora imeti vsaj 8 znakov'); d.password_hash = hashPassword(b.password); }
  if (Number(req.params.id) === req.user.id && (d.role === 'tech' || d.enabled === 0)) throw new HttpError(400, 'Sebi ne morete odvzeti pravic');
  await update('users', req.params.id, d);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/users/:id', admin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw new HttpError(400, 'Sebe ne morete izbrisati');
  await q.run('DELETE FROM users WHERE id=?', req.params.id); sendJson(res, 200, { ok: true });
});

// ---------- stranke ----------
const CUST_FIELDS = ['type', 'name', 'tax_id', 'vat_payer', 'reg_no', 'address', 'post', 'city', 'country', 'email', 'phone', 'contacts_json', 'notes', 'tags', 'payment_days'];
api.get('/api/customers', auth, async (req, res) => {
  const s = new URL(req.url, 'http://x').searchParams.get('q');
  const like = `%${s || ''}%`;
  const rows = await q.all(`SELECT c.*, (SELECT COUNT(*) FROM sites WHERE customer_id=c.id) sites,
      (SELECT COALESCE(SUM(total-paid),0) FROM documents WHERE customer_id=c.id AND type='invoice' AND status IN ('issued','partial')) unpaid
    FROM customers c WHERE (? = '' OR c.name LIKE ? OR c.city LIKE ? OR c.tax_id LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.tags LIKE ?
      OR c.id IN (SELECT customer_id FROM sites WHERE name LIKE ? OR address LIKE ?)) ORDER BY c.name LIMIT 500`, s || '', like, like, like, like, like, like, like, like);
  sendJson(res, 200, rows);
});
api.post('/api/customers', auth, async (req, res) => {
  const b = await readJson(req);
  if (!b.name) throw new HttpError(400, 'Naziv stranke je obvezen');
  const id = await insert('customers', pick(b, CUST_FIELDS));
  if (b.create_site !== false) await insert('sites', { customer_id: id, name: b.site_name || (b.type === 'person' ? 'Dom' : 'Sedež'), address: b.address, post: b.post, city: b.city, maintenance_months: 12 });
  await log(req, 'nova_stranka', b.name);
  sendJson(res, 200, { id });
});
api.get('/api/customers/:id', auth, async (req, res) => {
  const c = await q.get('SELECT * FROM customers WHERE id=?', req.params.id);
  if (!c) throw new HttpError(404, 'Stranka ne obstaja');
  c.sites = (await q.all(`SELECT s.*, (SELECT COUNT(*) FROM equipment WHERE site_id=s.id) equipment_count FROM sites s WHERE customer_id=? ORDER BY name`, c.id)).map(publicSite);
  c.documents = await q.all('SELECT id, type, number, status, date, due_date, total, paid, title FROM documents WHERE customer_id=? ORDER BY date DESC, id DESC', c.id);
  c.appointments = await q.all('SELECT * FROM appointments WHERE customer_id=? ORDER BY start DESC LIMIT 30', c.id);
  sendJson(res, 200, c);
});
api.put('/api/customers/:id', auth, async (req, res) => { await update('customers', req.params.id, pick(await readJson(req), CUST_FIELDS)); sendJson(res, 200, { ok: true }); });
api.delete('/api/customers/:id', admin, async (req, res) => {
  if (await q.get("SELECT 1 FROM documents WHERE customer_id=? AND type='invoice' AND status!='draft'", req.params.id)) throw new HttpError(400, 'Stranka ima izdane račune in je ni mogoče izbrisati');
  await q.run('DELETE FROM documents WHERE customer_id=?', req.params.id);
  await q.run('DELETE FROM customers WHERE id=?', req.params.id);
  await log(req, 'izbris_stranke', req.params.id);
  sendJson(res, 200, { ok: true });
});

// ---------- objekti ----------
const SITE_FIELDS = ['customer_id', 'name', 'address', 'post', 'city', 'gps', 'access_notes', 'visionone_url', 'maintenance_months', 'last_service', 'system_type', 'notes'];
function publicSite(s) {
  const out = { ...s, has_secret: !!s.secret_enc, has_token: !!s.visionone_token_enc, next_service: s.last_service && s.maintenance_months ? addMonths(s.last_service, s.maintenance_months) : null };
  delete out.secret_enc; delete out.visionone_token_enc;
  return out;
}
api.post('/api/sites', auth, async (req, res) => {
  const b = await readJson(req);
  if (!b.customer_id || !b.name) throw new HttpError(400, 'Stranka in ime objekta sta obvezna');
  const d = pick(b, SITE_FIELDS);
  if (b.secret) d.secret_enc = encrypt(b.secret);
  if (b.visionone_token) d.visionone_token_enc = encrypt(b.visionone_token);
  sendJson(res, 200, { id: await insert('sites', d) });
});
api.get('/api/sites/:id', auth, async (req, res) => {
  const s = await q.get('SELECT * FROM sites WHERE id=?', req.params.id);
  if (!s) throw new HttpError(404, 'Objekt ne obstaja');
  const out = publicSite(s);
  out.customer = await q.get('SELECT id, name, phone, email, address, city FROM customers WHERE id=?', s.customer_id);
  out.equipment = (await q.all('SELECT * FROM equipment WHERE site_id=? ORDER BY type, name', s.id)).map(e => { const x = { ...e, has_password: !!e.password_enc }; delete x.password_enc; return x; });
  out.plans = await q.all('SELECT id, name FROM plans WHERE site_id=? ORDER BY id', s.id);
  out.documents = await q.all('SELECT id, type, number, status, date, total, title FROM documents WHERE site_id=? ORDER BY date DESC', s.id);
  out.files = await q.all('SELECT id, name, mime, size, created_at FROM files WHERE site_id=? ORDER BY id DESC', s.id);
  sendJson(res, 200, out);
});
api.put('/api/sites/:id', auth, async (req, res) => {
  const b = await readJson(req);
  const d = pick(b, SITE_FIELDS);
  if (b.secret !== undefined && b.secret !== '') d.secret_enc = encrypt(b.secret);
  if (b.visionone_token !== undefined && b.visionone_token !== '') d.visionone_token_enc = encrypt(b.visionone_token);
  await update('sites', req.params.id, d);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/sites/:id', admin, async (req, res) => { await q.run('DELETE FROM sites WHERE id=?', req.params.id); sendJson(res, 200, { ok: true }); });
api.get('/api/sites/:id/secret', auth, async (req, res) => {
  const s = await q.get('SELECT secret_enc FROM sites WHERE id=?', req.params.id);
  await log(req, 'ogled_skrivnosti_objekta', req.params.id);
  sendJson(res, 200, { secret: decrypt(s?.secret_enc) || '' });
});
api.post('/api/sites/:id/serviced', auth, async (req, res) => {
  const b = await readJson(req);
  await update('sites', req.params.id, { last_service: b.date || today() });
  await log(req, 'servis_opravljen', req.params.id);
  sendJson(res, 200, { ok: true });
});
// Stanje sistema VisionOne pri stranki (prek API žetona)
api.get('/api/sites/:id/vms-status', auth, async (req, res) => {
  const s = await q.get('SELECT visionone_url, visionone_token_enc FROM sites WHERE id=?', req.params.id);
  if (!s?.visionone_url) throw new HttpError(400, 'Objekt nima povezave na VisionOne');
  const token = decrypt(s.visionone_token_enc);
  try {
    const r = await httpRequest(`${s.visionone_url.replace(/\/$/, '')}/api/integration/status`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 });
    if (r.status !== 200) throw new Error(r.status === 401 ? 'Žeton ni veljaven' : `HTTP ${r.status}`);
    sendJson(res, 200, JSON.parse(r.body.toString()));
  } catch (e) { throw new HttpError(502, `VisionOne ni dosegljiv: ${e.message}`); }
});

// ---------- oprema ----------
const EQ_FIELDS = ['site_id', 'type', 'name', 'brand', 'model', 'serial', 'mac', 'ip', 'firmware', 'username', 'location', 'installed_at', 'warranty_until', 'connected_to', 'port', 'product_id', 'notes', 'plan_id', 'plan_x', 'plan_y', 'dir', 'fov', 'range'];
api.post('/api/equipment', auth, async (req, res) => {
  const b = await readJson(req);
  const list = Array.isArray(b.items) ? b.items : [b];
  const ids = [];
  for (const it of list) {
    if (!it.site_id) throw new HttpError(400, 'Manjka objekt');
    const d = pick(it, EQ_FIELDS);
    if (it.password) d.password_enc = encrypt(it.password);
    ids.push(await insert('equipment', d));
  }
  sendJson(res, 200, { ids });
});
api.put('/api/equipment/:id', auth, async (req, res) => {
  const b = await readJson(req);
  const d = pick(b, EQ_FIELDS);
  if (b.password !== undefined && b.password !== '') d.password_enc = encrypt(b.password);
  if (b.clear_password) d.password_enc = null;
  await update('equipment', req.params.id, d);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/equipment/:id', auth, async (req, res) => { await q.run('DELETE FROM equipment WHERE id=?', req.params.id); sendJson(res, 200, { ok: true }); });
api.get('/api/equipment/:id/password', auth, async (req, res) => {
  const e = await q.get('SELECT password_enc FROM equipment WHERE id=?', req.params.id);
  await log(req, 'ogled_gesla_naprave', req.params.id);
  sendJson(res, 200, { password: decrypt(e?.password_enc) || '' });
});

// ---------- tlorisi in datoteke ----------
async function saveDataUrl(dataUrl, prefix) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Neveljavna datoteka');
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' }[m[1]] || 'bin';
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 25e6) throw new HttpError(400, 'Datoteka je prevelika (največ 25 MB)');
  const name = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await putBlob(name, m[1], buf);
  return { name, mime: m[1], size: buf.length };
}
async function sendBlob(req, res, name, headers = {}) {
  const b = await getBlob(name);
  if (!b) throw new HttpError(404, 'Datoteka ne obstaja');
  sendBuffer(req, res, b.data, b.mime || 'application/octet-stream', { 'Cache-Control': 'private, max-age=86400', ...headers });
}
api.post('/api/plans', auth, async (req, res) => {
  const b = await readJson(req);
  const f = await saveDataUrl(b.image, 'plan');
  sendJson(res, 200, { id: await insert('plans', { site_id: b.site_id, name: b.name || 'Tloris', image: f.name }) });
});
api.get('/api/plans/:id/image', auth, async (req, res) => {
  const p = await q.get('SELECT image FROM plans WHERE id=?', req.params.id);
  if (!p) throw new HttpError(404, 'Ni tlorisa');
  await sendBlob(req, res, p.image);
});
api.delete('/api/plans/:id', auth, async (req, res) => {
  const p = await q.get('SELECT image FROM plans WHERE id=?', req.params.id);
  if (p) await deleteBlob(p.image);
  await q.run('UPDATE equipment SET plan_id=NULL WHERE plan_id=?', req.params.id);
  await q.run('DELETE FROM plans WHERE id=?', req.params.id);
  sendJson(res, 200, { ok: true });
});
api.post('/api/files', auth, async (req, res) => {
  const b = await readJson(req);
  const f = await saveDataUrl(b.data, 'file');
  const id = await insert('files', { document_id: b.document_id || null, site_id: b.site_id || null, name: b.name || f.name, path: f.name, mime: f.mime, size: f.size, created_by: req.user.username });
  sendJson(res, 200, { id });
});
api.get('/api/files/:id', auth, async (req, res) => {
  const f = await q.get('SELECT * FROM files WHERE id=?', req.params.id);
  if (!f) throw new HttpError(404, 'Datoteka ne obstaja');
  await sendBlob(req, res, f.path, { 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}` });
});
api.delete('/api/files/:id', auth, async (req, res) => {
  const f = await q.get('SELECT * FROM files WHERE id=?', req.params.id);
  if (f) await deleteBlob(f.path);
  await q.run('DELETE FROM files WHERE id=?', req.params.id);
  sendJson(res, 200, { ok: true });
});

// ---------- katalog ----------
const PROD_FIELDS = ['sku', 'name', 'category', 'brand', 'unit', 'purchase_price', 'price', 'vat', 'stock', 'track_stock', 'min_stock', 'equipment_type', 'description', 'active'];
api.get('/api/products', auth, async (req, res) => {
  const u = new URL(req.url, 'http://x').searchParams;
  const s = `%${u.get('q') || ''}%`;
  sendJson(res, 200, await q.all(`SELECT * FROM products WHERE (name LIKE ? OR sku LIKE ? OR brand LIKE ? OR category LIKE ?) ${u.get('all') ? '' : 'AND active=1'} ORDER BY category, name LIMIT 1000`, s, s, s, s));
});
api.post('/api/products', auth, async (req, res) => {
  const b = await readJson(req);
  const list = Array.isArray(b.items) ? b.items : [b];
  const ids = [];
  for (const p of list) { if (!p.name) throw new HttpError(400, 'Naziv izdelka je obvezen'); ids.push(await insert('products', pick(p, PROD_FIELDS))); }
  sendJson(res, 200, { ids });
});
api.put('/api/products/:id', auth, async (req, res) => { await update('products', req.params.id, pick(await readJson(req), PROD_FIELDS)); sendJson(res, 200, { ok: true }); });
api.delete('/api/products/:id', admin, async (req, res) => {
  if (await q.get('SELECT 1 FROM doc_lines WHERE product_id=?', req.params.id)) { await update('products', req.params.id, { active: 0 }); return sendJson(res, 200, { ok: true, archived: true }); }
  await q.run('DELETE FROM products WHERE id=?', req.params.id); sendJson(res, 200, { ok: true });
});

// ---------- dokumenti: ponudbe, delovni nalogi, računi ----------
const DOC_FIELDS = ['customer_id', 'site_id', 'date', 'due_date', 'service_date', 'valid_until', 'title', 'notes', 'footer', 'technician', 'work_description', 'status', 'reference'];
async function saveLines(docId, lines) {
  await q.run('DELETE FROM doc_lines WHERE document_id=?', docId);
  for (const [i, l] of (lines || []).entries()) await insert('doc_lines', { document_id: docId, sort: i, product_id: l.product_id || null, description: l.description || '', qty: Number(l.qty) || 0, unit: l.unit || 'kos', price: Number(l.price) || 0, discount: Number(l.discount) || 0, vat: Number(l.vat ?? 22) });
  await recalc(docId);
}
async function recalc(docId) {
  const c = await company();
  const t = calcTotals(await q.all('SELECT * FROM doc_lines WHERE document_id=?', docId), !!c.vat_payer);
  const paid = (await q.get('SELECT COALESCE(SUM(amount),0) s FROM payments WHERE document_id=?', docId)).s;
  const d = await q.get('SELECT type, status FROM documents WHERE id=?', docId);
  let status = d.status;
  if (d.type === 'invoice' && ['issued', 'partial', 'paid'].includes(d.status)) status = paid >= t.total - 0.005 && t.total > 0 ? 'paid' : paid > 0 ? 'partial' : 'issued';
  await update('documents', docId, { total_net: t.total_net, total_vat: t.total_vat, total: t.total, paid, status, updated_at: Math.floor(Date.now() / 1000) });
}
async function customerSnapshot(id) {
  const c = await q.get('SELECT name, address, post, city, country, tax_id, vat_payer, reg_no FROM customers WHERE id=?', id);
  return c ? JSON.stringify(c) : null;
}
async function fullDoc(id) {
  const d = await q.get('SELECT d.*, c.name customer_name, s.name site_name FROM documents d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN sites s ON s.id=d.site_id WHERE d.id=?', id);
  if (!d) throw new HttpError(404, 'Dokument ne obstaja');
  d.lines = await q.all('SELECT * FROM doc_lines WHERE document_id=? ORDER BY sort, id', id);
  d.payments = await q.all('SELECT * FROM payments WHERE document_id=? ORDER BY date', id);
  d.files = await q.all('SELECT id, name, mime, size, created_at FROM files WHERE document_id=? ORDER BY id', id);
  d.totals = calcTotals(d.lines, !!(await company()).vat_payer);
  d.related = await q.all('SELECT id, type, number, status FROM documents WHERE source_id=? OR id=?', id, d.source_id || 0);
  return d;
}
api.get('/api/documents', auth, async (req, res) => {
  const u = new URL(req.url, 'http://x').searchParams;
  const where = [], args = [];
  if (u.get('type')) { where.push('d.type=?'); args.push(u.get('type')); }
  if (u.get('status')) { const s = u.get('status').split(','); where.push(`d.status IN (${s.map(() => '?').join(',')})`); args.push(...s); }
  if (u.get('customer')) { where.push('d.customer_id=?'); args.push(u.get('customer')); }
  if (u.get('year')) { where.push("substr(d.date,1,4)=?"); args.push(u.get('year')); }
  if (u.get('q')) { where.push('(d.number LIKE ? OR c.name LIKE ? OR d.title LIKE ?)'); const l = `%${u.get('q')}%`; args.push(l, l, l); }
  if (u.get('overdue')) { where.push("d.type='invoice' AND d.status IN ('issued','partial') AND d.due_date < ?"); args.push(today()); }
  sendJson(res, 200, await q.all(`SELECT d.id, d.type, d.number, d.status, d.date, d.due_date, d.valid_until, d.total, d.total_net, d.paid, d.title, d.customer_id, c.name customer_name, s.name site_name
    FROM documents d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN sites s ON s.id=d.site_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY d.date DESC, d.id DESC LIMIT 1000`, ...args));
});
api.post('/api/documents', auth, async (req, res) => {
  const b = await readJson(req);
  if (!DOC_TYPES[b.type]) throw new HttpError(400, 'Neznana vrsta dokumenta');
  if (!b.customer_id) throw new HttpError(400, 'Izberite stranko');
  const c = await company();
  const date = b.date || today();
  const d = { ...pick(b, DOC_FIELDS), type: b.type, date, created_by: req.user.full_name || req.user.username, year: Number(date.slice(0, 4)) };
  if (b.type === 'quote') { Object.assign(d, await nextNumber('quote', d.year)); d.valid_until = d.valid_until || addDays(date, c.quote_valid_days || 30); d.status = d.status || 'draft'; }
  if (b.type === 'workorder') { Object.assign(d, await nextNumber('workorder', d.year)); d.status = d.status || 'open'; d.technician = d.technician || req.user.full_name || req.user.username; }
  if (b.type === 'invoice') {
    const cu = await q.get('SELECT payment_days FROM customers WHERE id=?', b.customer_id);
    d.status = 'draft'; d.due_date = d.due_date || addDays(date, cu?.payment_days || c.payment_days || 8); d.service_date = d.service_date || date;
  }
  const id = await insert('documents', d);
  await saveLines(id, b.lines);
  await log(req, `nov_${b.type}`, d.number || id);
  sendJson(res, 200, { id });
});
api.get('/api/documents/:id', auth, async (req, res) => sendJson(res, 200, await fullDoc(req.params.id)));
api.put('/api/documents/:id', auth, async (req, res) => {
  const d = await q.get('SELECT * FROM documents WHERE id=?', req.params.id);
  if (!d) throw new HttpError(404, 'Dokument ne obstaja');
  const b = await readJson(req);
  if (d.type === 'invoice' && d.status !== 'draft') {
    // izdan račun: dovoljene le opombe, plačila in stornacija
    const allowed = pick(b, ['notes']);
    if (b.status === 'cancelled') allowed.status = 'cancelled';
    await update('documents', d.id, allowed);
    return sendJson(res, 200, { ok: true, locked: true });
  }
  const data = pick(b, DOC_FIELDS);
  if (data.customer_id && d.type === 'invoice') data.customer_json = null;
  await update('documents', d.id, data);
  if (b.lines) await saveLines(d.id, b.lines); else await recalc(d.id);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/documents/:id', auth, async (req, res) => {
  const d = await q.get('SELECT * FROM documents WHERE id=?', req.params.id);
  if (d?.type === 'invoice' && d.status !== 'draft') throw new HttpError(400, 'Izdanega računa ni mogoče izbrisati – uporabite stornacijo');
  await q.run('DELETE FROM documents WHERE id=?', req.params.id);
  await log(req, 'izbris_dokumenta', d?.number || req.params.id);
  sendJson(res, 200, { ok: true });
});
// Izdaja računa: dodeli zaporedno številko, zaklene podatke kupca in odšteje zalogo
api.post('/api/documents/:id/issue', auth, async (req, res) => {
  const d = await q.get('SELECT * FROM documents WHERE id=?', req.params.id);
  if (!d || d.type !== 'invoice') throw new HttpError(400, 'To ni račun');
  if (d.status !== 'draft') throw new HttpError(400, 'Račun je že izdan');
  const lines = await q.all('SELECT * FROM doc_lines WHERE document_id=?', d.id);
  if (!lines.length) throw new HttpError(400, 'Račun nima postavk');
  const number = await transaction(async () => {
    // ponovno preveri stanje znotraj transakcije (dvojni klik / dve napravi)
    const cur = await q.get('SELECT status FROM documents WHERE id=?' + (DIALECT === 'mysql' ? ' FOR UPDATE' : ''), d.id);
    if (cur?.status !== 'draft') throw new HttpError(400, 'Račun je že izdan');
    const year = Number(d.date.slice(0, 4));
    const { seq, number } = await nextNumber('invoice', year);
    await update('documents', d.id, { number, seq, year, status: 'issued', reference: reference(number), customer_json: await customerSnapshot(d.customer_id) });
    // zaloga (če ni bila že odšteta na delovnem nalogu)
    const src = d.source_id ? await q.get('SELECT type, stock_done FROM documents WHERE id=?', d.source_id) : null;
    if (!d.stock_done && !(src?.type === 'workorder' && src.stock_done)) {
      for (const l of lines) if (l.product_id) await q.run('UPDATE products SET stock=stock-? WHERE id=? AND track_stock=1', l.qty, l.product_id);
      await update('documents', d.id, { stock_done: 1 });
    }
    await recalc(d.id);
    return number;
  });
  await log(req, 'izdan_racun', number);
  sendJson(res, 200, { ok: true, number });
});
// Pretvorba: ponudba → delovni nalog / račun, delovni nalog → račun
api.post('/api/documents/:id/convert', auth, async (req, res) => {
  const src = await fullDoc(req.params.id);
  const b = await readJson(req);
  if (!['workorder', 'invoice'].includes(b.to)) throw new HttpError(400, 'Neveljavna pretvorba');
  const c = await company();
  const date = today();
  const d = { type: b.to, customer_id: src.customer_id, site_id: src.site_id, title: src.title, date, year: Number(date.slice(0, 4)), source_id: src.id, created_by: req.user.full_name || req.user.username };
  if (b.to === 'workorder') { Object.assign(d, await nextNumber('workorder', d.year)); d.status = 'open'; d.technician = req.user.full_name || req.user.username; d.work_description = src.title ? `${src.title}\n` : ''; }
  else { const cu = await q.get('SELECT payment_days FROM customers WHERE id=?', src.customer_id); d.status = 'draft'; d.due_date = addDays(date, cu?.payment_days || c.payment_days || 8); d.service_date = src.type === 'workorder' ? src.date : date; }
  const id = await insert('documents', d);
  await saveLines(id, src.lines);
  if (src.type === 'quote') await update('documents', src.id, { status: 'accepted' });
  await log(req, `pretvorba_${src.type}_${b.to}`, src.number);
  sendJson(res, 200, { id });
});
api.post('/api/documents/:id/duplicate', auth, async (req, res) => {
  const src = await fullDoc(req.params.id);
  const date = today();
  const d = { type: src.type, customer_id: src.customer_id, site_id: src.site_id, title: src.title, notes: src.notes, date, year: Number(date.slice(0, 4)), created_by: req.user.full_name || req.user.username };
  if (src.type === 'quote') { Object.assign(d, await nextNumber('quote', d.year)); d.status = 'draft'; d.valid_until = addDays(date, (await company()).quote_valid_days || 30); }
  if (src.type === 'workorder') { Object.assign(d, await nextNumber('workorder', d.year)); d.status = 'open'; }
  if (src.type === 'invoice') { d.status = 'draft'; d.due_date = addDays(date, (await company()).payment_days || 8); d.service_date = date; }
  const id = await insert('documents', d);
  await saveLines(id, src.lines);
  sendJson(res, 200, { id });
});
// Zaključek delovnega naloga: odštej porabljen material
api.post('/api/documents/:id/close', auth, async (req, res) => {
  const d = await q.get('SELECT * FROM documents WHERE id=?', req.params.id);
  if (d?.type !== 'workorder') throw new HttpError(400, 'To ni delovni nalog');
  if (!d.stock_done) for (const l of await q.all('SELECT * FROM doc_lines WHERE document_id=?', d.id)) if (l.product_id) await q.run('UPDATE products SET stock=stock-? WHERE id=? AND track_stock=1', l.qty, l.product_id);
  await update('documents', d.id, { status: 'done', stock_done: 1 });
  if (d.site_id && (await readJson(req)).serviced) await update('sites', d.site_id, { last_service: d.date });
  await log(req, 'zakljucen_nalog', d.number);
  sendJson(res, 200, { ok: true });
});
api.post('/api/documents/:id/sign', auth, async (req, res) => {
  const b = await readJson(req);
  if (!/^data:image\/png;base64,/.test(b.signature || '')) throw new HttpError(400, 'Manjka podpis');
  await update('documents', req.params.id, { signature: b.signature, signed_name: b.name || '', signed_at: Math.floor(Date.now() / 1000) });
  sendJson(res, 200, { ok: true });
});
api.post('/api/documents/:id/payments', auth, async (req, res) => {
  const b = await readJson(req);
  const d = await q.get('SELECT * FROM documents WHERE id=?', req.params.id);
  if (d?.type !== 'invoice' || d.status === 'draft') throw new HttpError(400, 'Plačila lahko vnesete samo za izdane račune');
  if (!(Number(b.amount) > 0)) throw new HttpError(400, 'Vnesite znesek');
  await insert('payments', { document_id: d.id, date: b.date || today(), amount: Number(b.amount), method: b.method || 'TRR', note: b.note });
  await recalc(d.id);
  await log(req, 'placilo', `${d.number}: ${b.amount}`);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/payments/:id', auth, async (req, res) => {
  const p = await q.get('SELECT document_id FROM payments WHERE id=?', req.params.id);
  await q.run('DELETE FROM payments WHERE id=?', req.params.id);
  if (p) await recalc(p.document_id);
  sendJson(res, 200, { ok: true });
});

// ---------- koledar ----------
const APP_FIELDS = ['customer_id', 'site_id', 'document_id', 'start', 'end', 'title', 'type', 'notes', 'technician', 'done'];
api.get('/api/appointments', auth, async (req, res) => {
  const u = new URL(req.url, 'http://x').searchParams;
  sendJson(res, 200, await q.all(`SELECT a.*, c.name customer_name, s.name site_name, s.address site_address, s.city site_city, c.phone customer_phone FROM appointments a
    LEFT JOIN customers c ON c.id=a.customer_id LEFT JOIN sites s ON s.id=a.site_id WHERE a.start>=? AND a.start<? ORDER BY a.start`, Number(u.get('from')) || 0, Number(u.get('to')) || 9e9));
});
api.post('/api/appointments', auth, async (req, res) => { const b = await readJson(req); if (!b.start) throw new HttpError(400, 'Manjka čas'); sendJson(res, 200, { id: await insert('appointments', pick({ technician: req.user.full_name || req.user.username, ...b }, APP_FIELDS)) }); });
api.put('/api/appointments/:id', auth, async (req, res) => { await update('appointments', req.params.id, pick(await readJson(req), APP_FIELDS)); sendJson(res, 200, { ok: true }); });
api.delete('/api/appointments/:id', auth, async (req, res) => { await q.run('DELETE FROM appointments WHERE id=?', req.params.id); sendJson(res, 200, { ok: true }); });
api.get('/api/appointments/:id/ics', auth, async (req, res) => {
  const a = await q.get('SELECT a.*, c.name customer_name, s.address, s.city FROM appointments a LEFT JOIN customers c ON c.id=a.customer_id LEFT JOIN sites s ON s.id=a.site_id WHERE a.id=?', req.params.id);
  if (!a) throw new HttpError(404, 'Termin ne obstaja');
  const f = t => new Date(t * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const e = s => String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VisionOne Field//SL', 'BEGIN:VEVENT', `UID:v1f-${a.id}@visionone`, `DTSTAMP:${f(Date.now() / 1000)}`, `DTSTART:${f(a.start)}`, `DTEND:${f(a.end || a.start + 3600)}`,
    `SUMMARY:${e(`${a.title || 'Termin'} – ${a.customer_name || ''}`)}`, `LOCATION:${e([a.address, a.city].filter(Boolean).join(', '))}`, `DESCRIPTION:${e(a.notes)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="termin-${a.id}.ics"` });
  res.end(ics);
});

// ---------- izvozi in varnostna kopija ----------
function csv(rows, cols) {
  const e = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.map(c => c[1]).join(';'), ...rows.map(r => cols.map(c => e(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(';'))].join('\r\n');
}
const num2 = v => (Number(v) || 0).toFixed(2).replace('.', ',');
api.get('/api/export/customers.csv', auth, async (req, res) => {
  const rows = await q.all('SELECT * FROM customers ORDER BY name');
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="stranke.csv"' });
  res.end(csv(rows, [['name', 'Naziv'], [r => (r.type === 'person' ? 'Fizična oseba' : 'Podjetje'), 'Vrsta'], ['tax_id', 'Davčna št.'], ['address', 'Naslov'], ['post', 'Pošta'], ['city', 'Kraj'], ['phone', 'Telefon'], ['email', 'E-pošta'], ['notes', 'Opombe']]));
});
api.get('/api/export/invoices.csv', auth, async (req, res) => {
  const y = new URL(req.url, 'http://x').searchParams.get('year') || new Date().getFullYear();
  const rows = await q.all("SELECT d.*, c.name customer_name, c.tax_id FROM documents d LEFT JOIN customers c ON c.id=d.customer_id WHERE d.type='invoice' AND d.status!='draft' AND d.year=? ORDER BY d.seq", y);
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="racuni-${y}.csv"` });
  res.end(csv(rows, [['number', 'Številka'], ['date', 'Datum'], ['due_date', 'Zapadlost'], ['customer_name', 'Kupec'], ['tax_id', 'Davčna št.'], [r => num2(r.total_net), 'Osnova'], [r => num2(r.total_vat), 'DDV'], [r => num2(r.total), 'Skupaj'], [r => num2(r.paid), 'Plačano'], [r => STATUS.invoice[r.status], 'Stanje']]));
});
// Varnostna kopija: vse tabele v JSON (gesla ostanejo šifrirana). Datoteke/fotografije so v tabeli blobs in niso vključene,
// ker je odgovor na Vercelu omejen na ~4,5 MB – za popolno kopijo uporabite izvoz baze pri ponudniku (phpMyAdmin).
const BACKUP_TABLES = ['settings', 'users', 'customers', 'sites', 'plans', 'products', 'equipment', 'documents', 'doc_lines', 'payments', 'files', 'appointments', 'sequences'];
api.get('/api/backup', admin, async (req, res) => {
  const out = { app: 'VisionOne Field', version: VERSION, created: new Date().toISOString(), tables: {} };
  for (const t of BACKUP_TABLES) out.tables[t] = await q.all(`SELECT * FROM ${t}`);
  for (const u of out.tables.users) delete u.password_hash;
  await log(req, 'varnostna_kopija');
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="visionone-field-${today()}.json"`, 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(out));
});
api.get('/api/meta', auth, async (req, res) => sendJson(res, 200, { doc_types: DOC_TYPES, status: STATUS, equipment_types: EQUIP_TYPES }));

// ---------- natisljivi dokumenti ----------
export async function printRoute(req, res, pathname, search) {
  if (!req.user) { res.writeHead(302, { Location: '/' }); return res.end(); }
  let m, html = null;
  if ((m = /^\/print\/document\/(\d+)$/.exec(pathname))) html = await renderDocument(Number(m[1]));
  else if ((m = /^\/print\/site\/(\d+)\/handover$/.exec(pathname))) { html = await renderHandover(Number(m[1]), { passwords: search.get('passwords') === '1' }); if (search.get('passwords') === '1') await log(req, 'zapisnik_z_gesli', m[1]); }
  else if ((m = /^\/print\/site\/(\d+)\/notice$/.exec(pathname))) html = await renderNotice(Number(m[1]), Object.fromEntries(search));
  if (!html) { res.writeHead(404); return res.end('Ni najdeno'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}
