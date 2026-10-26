// Celovit preizkus na SQLite: uvoz strank iz prejšnjega portala, prijava, ponudba → nalog → račun, datoteke
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createLegacyDb } from './legacy-fixture.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-'));
createLegacyDb(path.join(dir, 'field.db'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PASSWORD = 'Geslo1234';
delete process.env.DATABASE_URL;
const { default: handler } = await import('../api/handler.js');

test('Field od konca do konca', async () => {
  const srv = http.createServer(handler);
  await new Promise(r => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  let cookie = '';
  const call = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    const t = await r.text();
    try { return { status: r.status, data: JSON.parse(t) }; } catch { return { status: r.status, data: t }; }
  };
  try {
    assert.equal((await call('GET', '/api/customers')).status, 401);
    assert.equal((await call('POST', '/api/handler?__p=api/auth/login', { username: 'admin', password: 'Geslo1234' })).status, 200);

    const customers = (await call('GET', '/api/customers')).data;
    assert.deepEqual(customers.map(c => c.name).sort(), ['Janez Kranjc', 'Zlatarna Novak d.o.o.']);
    const zl = customers.find(c => c.name.startsWith('Zlatarna'));
    assert.equal(zl.tags, 'VIP, teren');
    const site = (await call('GET', `/api/customers/${zl.id}`)).data.sites[0];
    const s = (await call('GET', `/api/sites/${site.id}`)).data;
    assert.equal(s.equipment.length, 5);
    assert.equal(s.files.length, 1);
    const cam = s.equipment.find(e => e.name === 'Vhod');
    assert.equal((await call('GET', `/api/equipment/${cam.id}/password`)).data.password, 'Tajno123!');

    const q = await call('POST', '/api/documents', { type: 'quote', customer_id: zl.id, site_id: site.id, lines: [{ description: 'Kamera', qty: 2, price: 100, vat: 22 }] });
    const wo = await call('POST', `/api/documents/${q.data.id}/convert`, { to: 'workorder' });
    const inv = await call('POST', `/api/documents/${wo.data.id}/convert`, { to: 'invoice' });
    const issued = await call('POST', `/api/documents/${inv.data.id}/issue`);
    assert.match(issued.data.number, /^\d{4}-0001$/);
    assert.equal((await call('POST', `/api/documents/${inv.data.id}/issue`)).status, 400);
    const doc = (await call('GET', `/api/documents/${inv.data.id}`)).data;
    assert.equal(doc.total, 244);
    assert.equal((await call('GET', `/print/document/${inv.data.id}`)).status, 200);
  } finally { srv.close(); }
});
