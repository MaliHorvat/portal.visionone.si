// Povpraševanja s spletne strani visionone.si (kontaktni obrazec) – shranijo se v portal, po želji še e-pošta.
import { api, auth, log } from './api.js';
import { q, insert, update, getSetting } from './db.js';
import { HttpError, readJson, sendJson, clientIp } from './http-util.js';

// Od kod sme brskalnik pošiljati obrazec (CORS)
const ORIGINS = new Set(['https://visionone.si', 'https://www.visionone.si', 'http://localhost:3000',
  ...String(process.env.INQUIRY_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)]);
export function corsFor(req, res) {
  const origin = req.headers.origin;
  const ok = origin && (ORIGINS.has(origin) || /^https:\/\/visionone-[\w-]+\.vercel\.app$/.test(origin));
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  return ok;
}

const TOPICS = { cctv: 'Videonadzor', alarm: 'Alarm', pozar: 'Požarna signalizacija', domofon: 'Domofonija', mreza: 'Omrežje / Wi-Fi', servis: 'Servis', portal: 'VisionOne portal', anketa: 'Anonimna anketa', general: 'Splošno' };
const s = (v, max) => String(v ?? '').replace(/\s+$/g, '').trim().slice(0, max);

api.post('/api/public/inquiry', async (req, res) => {
  corsFor(req, res);
  const b = await readJson(req);
  // past za robote: skrito polje mora ostati prazno, obrazec ne sme biti oddan prehitro
  if (s(b.website, 200) || (Number(b.elapsed) > 0 && Number(b.elapsed) < 2500)) return sendJson(res, 200, { ok: true });
  const name = s(b.name, 200), email = s(b.email, 320), phone = s(b.phone, 64), message = s(b.message, 8000);
  if (name.length < 2) throw new HttpError(400, 'Vpišite ime in priimek.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && phone.replace(/\D/g, '').length < 6) throw new HttpError(400, 'Vpišite veljaven e-naslov ali telefonsko številko.');
  if (message.length < 5) throw new HttpError(400, 'Na kratko opišite, kaj potrebujete.');
  const ip = clientIp(req);
  const since = Math.floor(Date.now() / 1000) - 3600;
  if ((await q.get('SELECT COUNT(*) n FROM inquiries WHERE ip=? AND created_at>?', ip, since)).n >= 6) throw new HttpError(429, 'Prejeli smo že več sporočil z vašega naslova. Pokličite nas ali poskusite čez eno uro.');
  const topic = TOPICS[b.topic] ? b.topic : 'general';
  const devices = Number.parseInt(b.devices, 10);
  const row = {
    status: 'new', source: s(b.source, 64) || 'visionone.si', topic, name, email: email || null, phone: phone || null,
    company: s(b.company, 200) || null, site_type: s(b.site_type, 64) || null, devices: Number.isFinite(devices) && devices > 0 && devices < 100000 ? devices : null,
    timeline: s(b.timeline, 64) || null, message, page: s(b.page, 500) || null, ip,
  };
  const id = await insert('inquiries', row);
  await notify({ id, ...row }).catch(e => console.error('[povpraševanje] e-pošta ni bila poslana:', e.message));
  sendJson(res, 200, { ok: true, id });
});

// Neobvezno obvestilo po e-pošti prek Resend (RESEND_API_KEY, INQUIRY_NOTIFY_TO, INQUIRY_FROM)
async function notify(r) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const company = (await getSetting('company', {})) || {};
  const to = process.env.INQUIRY_NOTIFY_TO || company.email || 'info@visionone.si';
  const from = process.env.INQUIRY_FROM || 'VisionOne <onboarding@resend.dev>';
  const lines = [`Novo povpraševanje (${TOPICS[r.topic]})`, '', `Ime: ${r.name}`, r.company && `Podjetje: ${r.company}`, r.email && `E-pošta: ${r.email}`, r.phone && `Telefon: ${r.phone}`,
    r.site_type && `Objekt: ${r.site_type}`, r.devices && `Število naprav: ${r.devices}`, r.timeline && `Rok: ${r.timeline}`, '', r.message, '', `Odprite v portalu: https://portal.visionone.si/#/povprasevanja`].filter(x => x !== null && x !== undefined && x !== false);
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `[VisionOne] Povpraševanje: ${r.name}`, text: lines.join('\n'), ...(r.email ? { reply_to: r.email } : {}) }),
  });
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
}

api.get('/api/inquiries', auth, async (req, res) => {
  const st = new URL(req.url, 'http://x').searchParams.get('status');
  const rows = await q.all(`SELECT i.*, c.name customer_name FROM inquiries i LEFT JOIN customers c ON c.id=i.customer_id ${st && st !== 'all' ? 'WHERE i.status=?' : ''} ORDER BY i.created_at DESC LIMIT 300`, ...(st && st !== 'all' ? [st] : []));
  sendJson(res, 200, rows);
});
api.put('/api/inquiries/:id', auth, async (req, res) => {
  const b = await readJson(req);
  const d = {};
  if (['new', 'open', 'done', 'spam'].includes(b.status)) { d.status = b.status; d.handled_by = req.user.username; d.handled_at = Math.floor(Date.now() / 1000); }
  if (b.customer_id !== undefined) d.customer_id = b.customer_id ? Number(b.customer_id) : null;
  await update('inquiries', req.params.id, d);
  await log(req, 'povprasevanje', `${req.params.id} ${d.status || ''}`);
  sendJson(res, 200, { ok: true });
});
api.delete('/api/inquiries/:id', auth, async (req, res) => { await q.run('DELETE FROM inquiries WHERE id=?', req.params.id); sendJson(res, 200, { ok: true }); });
