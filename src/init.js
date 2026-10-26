// Začetni koraki ob prvem zagonu: skrbnik, začetni katalog in uvoz strank iz prejšnjega portala.
import crypto from 'node:crypto';
import { q, insert, onInit, tableExists, getSetting, setSetting, encrypt, putBlob, transaction } from './db.js';
import { hashPassword } from './api.js';

onInit(async () => {
  if (!(await q.get('SELECT id FROM users LIMIT 1'))) {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw && process.env.VERCEL) throw new Error('Nastavite okoljsko spremenljivko ADMIN_PASSWORD (začetno geslo skrbnika).');
    await insert('users', { username: process.env.ADMIN_USER || 'admin', full_name: 'Skrbnik', role: 'admin', password_hash: hashPassword(pw || 'admin') });
    console.log('[Field] ustvarjen skrbnik (geslo iz ADMIN_PASSWORD) – po prvi prijavi ga spremenite');
  }
  if (!(await q.get('SELECT id FROM products LIMIT 1'))) {
    // začetni katalog – cene uredite v aplikaciji
    const items = [
      ['DELO', 'Montaža in priklop opreme', 'Storitve', 'ura', 0, 35, 0, 'other'],
      ['PROG', 'Nastavitev in programiranje sistema', 'Storitve', 'ura', 0, 40, 0, 'other'],
      ['SERVIS', 'Redni servisni pregled sistema', 'Storitve', 'kos', 0, 60, 0, 'other'],
      ['PREVOZ', 'Prevozni stroški', 'Storitve', 'km', 0, 0.5, 0, 'other'],
      ['CAM-4MP-B', 'IP kamera 4 MP, bullet, IR 30 m', 'Kamere', 'kos', 70, 129, 1, 'camera'],
      ['CAM-4MP-D', 'IP kamera 4 MP, dome, IR 30 m', 'Kamere', 'kos', 70, 129, 1, 'camera'],
      ['CAM-PTZ', 'IP PTZ kamera 4 MP, 25× zoom', 'Kamere', 'kos', 380, 649, 1, 'camera'],
      ['NVR-8P', 'Snemalnik NVR, 8 kanalov, 8× PoE', 'Snemalniki', 'kos', 140, 239, 1, 'nvr'],
      ['NVR-16P', 'Snemalnik NVR, 16 kanalov, 16× PoE', 'Snemalniki', 'kos', 260, 429, 1, 'nvr'],
      ['HDD-4TB', 'Trdi disk 4 TB za videonadzor', 'Diski', 'kos', 85, 129, 1, 'disk'],
      ['HDD-8TB', 'Trdi disk 8 TB za videonadzor', 'Diski', 'kos', 165, 239, 1, 'disk'],
      ['SW-POE8', 'PoE stikalo 8 vrat', 'Omrežje', 'kos', 55, 89, 1, 'switch'],
      ['UTP6', 'Kabel UTP Cat6, zunanji', 'Material', 'm', 0.45, 0.9, 1, 'other'],
      ['RJ45', 'Konektor RJ45 Cat6', 'Material', 'kos', 0.3, 0.8, 1, 'other'],
      ['DOZA', 'Razdelilna doza IP66', 'Material', 'kos', 3, 7, 1, 'other'],
      ['UPS-600', 'UPS 600 VA', 'Napajanje', 'kos', 55, 89, 1, 'ups'],
      ['TABLA', 'Opozorilna tabla Videonadzor', 'Material', 'kos', 4, 12, 1, 'other'],
    ];
    for (const [sku, name, category, unit, purchase_price, price, track, equipment_type] of items) await insert('products', { sku, name, category, unit, purchase_price, price, vat: 22, track_stock: track, stock: 0, equipment_type });
  }
  if (!(await getSetting('legacy_import'))) {
    try { await importLegacy(); } catch (e) { console.error('[Field] uvoz strank iz prejšnjega portala ni uspel:', e); }
  }
});

// ---------- uvoz iz prejšnjega portala (tabele Prisma: Client, ClientCamera …) ----------
const s = v => (v == null ? '' : String(v)).trim();
const tsOf = v => { const t = v ? Date.parse(String(v).replace(' ', 'T') + (String(v).endsWith('Z') ? '' : 'Z')) : NaN; return Number.isFinite(t) ? Math.floor(t / 1000) : undefined; };
const dateOf = v => (/^\d{4}-\d{2}-\d{2}/.test(s(v)) ? s(v).slice(0, 10) : null);
const parseJson = (v, def) => { if (v == null) return def; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return def; } };
async function rowsOf(table, sql, ...p) { return (await tableExists(table)) ? q.all(sql, ...p) : []; }

/** Prenese stranke, naprave, dokumente in opomnike iz tabel prejšnjega portala. Ponovni zagon ne podvaja (legacy_id). */
export async function importLegacy() {
  if (!(await tableExists('Client'))) { await setSetting('legacy_import', { at: new Date().toISOString(), customers: 0, note: 'ni tabel prejšnjega portala' }); return { customers: 0 }; }
  const done = new Set((await q.all('SELECT legacy_id FROM customers WHERE legacy_id IS NOT NULL')).map(r => r.legacy_id));
  const clients = (await q.all('SELECT * FROM `Client` ORDER BY sortOrder, name')).filter(c => !done.has(c.id));
  const packages = new Map((await rowsOf('SubscriptionPackage', 'SELECT id, name, price FROM `SubscriptionPackage`')).map(p => [p.id, p]));
  const profileNotes = new Map((await rowsOf('ClientProfileNote', 'SELECT clientId, content FROM `ClientProfileNote`')).map(n => [n.clientId, n.content]));
  const stats = { customers: 0, equipment: 0, files: 0, appointments: 0 };

  for (const c of clients) {
    await transaction(async () => {
      const pkg = c.packageId ? packages.get(c.packageId) : null;
      const tags = parseJson(c.tags, []);
      const notes = [
        pkg && `Vzdrževalni paket: ${pkg.name}${pkg.price ? ` (${Number(pkg.price).toFixed(2).replace('.', ',')} € / mesec)` : ''}`,
        Number(c.careBoxEnabled) ? `VisionOne Care Box${s(c.careSlaTier) ? ` – SLA ${s(c.careSlaTier)}` : ''}` : '',
        s(profileNotes.get(c.id)),
        'Uvoženo iz prejšnjega portala.',
      ].filter(Boolean).join('\n');
      const contacts = s(c.contact) ? [{ name: s(c.contact), phone: s(c.phone), email: s(c.email) }] : [];
      const customerId = await insert('customers', {
        type: /\b(d\.?\s?o\.?\s?o|s\.?\s?p|d\.?\s?d|z\.?\s?o\.?\s?o|k\.?\s?d)\b/i.test(s(c.name)) || (s(c.contact) && s(c.contact) !== s(c.name)) ? 'company' : 'person',
        name: s(c.name) || 'Brez imena', address: s(c.address) || null, email: s(c.email) || null, phone: s(c.phone) || null,
        contacts_json: JSON.stringify(contacts), notes, tags: Array.isArray(tags) && tags.length ? tags.join(', ') : null,
        legacy_id: c.id, created_at: tsOf(c.createdAt),
      });
      const siteNotes = [
        s(c.careRemoteNotes),
        dateOf(c.diskReplaceDueDate) && `Priporočena menjava diska do ${dateOf(c.diskReplaceDueDate)}${s(c.diskReplaceNote) ? ` – ${s(c.diskReplaceNote)}` : ''}`,
        dateOf(c.preventiveInspectionDueDate) && `Preventivni pregled do ${dateOf(c.preventiveInspectionDueDate)}${s(c.preventiveInspectionNote) ? ` – ${s(c.preventiveInspectionNote)}` : ''}`,
      ].filter(Boolean).join('\n');
      const siteId = await insert('sites', {
        customer_id: customerId, name: 'Objekt', address: s(c.address) || null, maintenance_months: pkg ? 12 : 0,
        system_type: 'Videonadzor', notes: siteNotes || null, created_at: tsOf(c.createdAt),
      });

      const eq = async (type, d) => { await insert('equipment', { site_id: siteId, type, ...d }); stats.equipment++; };
      for (const x of await rowsOf('ClientRecorder', 'SELECT * FROM `ClientRecorder` WHERE clientId=? ORDER BY name', c.id))
        await eq('nvr', { name: s(x.name), ip: s(x.ip) || null, model: s(x.model) || null, notes: [s(x.comment), Number(x.diskTb) ? `Disk: ${x.diskTb} TB` : ''].filter(Boolean).join('\n') || null });
      for (const x of await rowsOf('ClientSwitch', 'SELECT * FROM `ClientSwitch` WHERE clientId=? ORDER BY name', c.id))
        await eq('switch', { name: s(x.name), ip: s(x.ip) || null, model: s(x.model) || null, notes: [s(x.comment), Number(x.ports) ? `${x.ports} vrat` : ''].filter(Boolean).join('\n') || null });
      for (const x of await rowsOf('ClientCamera', 'SELECT * FROM `ClientCamera` WHERE clientId=? ORDER BY name', c.id))
        await eq('camera', {
          name: s(x.name), ip: s(x.ip) || null, model: s(x.model) || null, username: s(x.rtspUser) || null, password_enc: encrypt(s(x.rtspPass)),
          location: s(x.tag) || null, port: x.checkPort ? String(x.checkPort) : null,
          notes: [s(x.comment), s(x.streamUrl) && `Tok: ${s(x.streamUrl)}`].filter(Boolean).join('\n') || null,
        });
      for (const x of await rowsOf('ClientDisk', 'SELECT * FROM `ClientDisk` WHERE clientId=? ORDER BY label', c.id))
        await eq('disk', {
          name: s(x.label), ip: s(x.ip) || null, model: s(x.model) || null, serial: s(x.serial) || null, installed_at: dateOf(x.installedAt),
          notes: [Number(x.sizeTb) ? `${x.sizeTb} TB` : '', s(x.health) && s(x.health) !== 'ok' ? `Stanje: ${s(x.health)}` : '', s(x.comment)].filter(Boolean).join('\n') || null,
        });

      for (const r of await rowsOf('MaintenanceReminder', 'SELECT * FROM `MaintenanceReminder` WHERE clientId=?', c.id)) {
        const d = dateOf(r.dueDate);
        if (!d) continue;
        const start = Math.floor(new Date(`${d}T08:00:00`).getTime() / 1000); // lokalni čas (src/tz.js)
        await insert('appointments', { customer_id: customerId, site_id: siteId, start, end: start + 3600, title: s(r.title) || 'Servis', type: 'service', done: Number(r.completed) ? 1 : 0, notes: s(r.kind) && s(r.kind) !== 'drugo' ? `Vrsta: ${s(r.kind)}` : null });
        stats.appointments++;
      }
      // dokumenti in fotografije
      for (const meta of await rowsOf('ClientDocument', 'SELECT id, folder, originalName, mimeType, sizeBytes, createdAt FROM `ClientDocument` WHERE clientId=? ORDER BY createdAt', c.id)) {
        const row = await q.get('SELECT data FROM `ClientDocument` WHERE id=?', meta.id);
        if (!row?.data) continue;
        const buf = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
        const ext = (s(meta.originalName).match(/\.(\w{1,6})$/) || [, 'bin'])[1].toLowerCase();
        const name = `legacy_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        await putBlob(name, s(meta.mimeType) || 'application/octet-stream', buf);
        await insert('files', { site_id: siteId, name: [s(meta.folder), s(meta.originalName)].filter(Boolean).join('/') || name, path: name, mime: s(meta.mimeType) || 'application/octet-stream', size: buf.length, created_by: 'uvoz', created_at: tsOf(meta.createdAt) });
        stats.files++;
      }
    });
    stats.customers++;
  }
  const total = (await q.get('SELECT COUNT(*) n FROM customers WHERE legacy_id IS NOT NULL')).n;
  await setSetting('legacy_import', { at: new Date().toISOString(), ...stats, total });
  if (stats.customers) console.log('[Field] uvoz iz prejšnjega portala:', stats);
  return stats;
}
