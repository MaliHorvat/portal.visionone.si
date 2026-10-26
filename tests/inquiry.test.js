// Povpraševanja s kontaktnega obrazca visionone.si
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'field-inq-'));
process.env.ADMIN_PASSWORD = 'Geslo1234';
delete process.env.DATABASE_URL;
const { default: handler } = await import('../api/handler.js');

test('povpraševanje: CORS, shranjevanje, zaščita pred roboti in omejitev', async () => {
  const srv = http.createServer(handler);
  await new Promise(r => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  const send = (body, ip = '1.2.3.4') => fetch(`${base}/api/public/inquiry`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://visionone.si', 'x-forwarded-for': ip }, body: JSON.stringify(body) });
  try {
    const pre = await fetch(`${base}/api/public/inquiry`, { method: 'OPTIONS', headers: { origin: 'https://visionone.si', 'access-control-request-method': 'POST' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://visionone.si');
    const evil = await fetch(`${base}/api/public/inquiry`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    assert.equal(evil.headers.get('access-control-allow-origin'), null);

    const ok = await send({ name: 'Ana Novak', email: 'ana@primer.si', phone: '040 123 456', company: 'Pekarna Novak', topic: 'cctv', devices: '8', message: 'Potrebujemo 8 kamer za trgovino.', elapsed: 9000 });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://visionone.si');
    const bad = await send({ name: 'A', email: 'x', message: '' });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /ime/i);
    assert.equal(bad.headers.get('access-control-allow-origin'), 'https://visionone.si');
    // robot: skrito polje izpolnjeno → tiho sprejeto, ne shranjeno
    assert.equal((await send({ name: 'Bot', email: 'b@b.si', message: 'spam spam', website: 'http://x' })).status, 200);
    for (let i = 0; i < 5; i++) await send({ name: 'Ana Novak', email: 'ana@primer.si', message: `Sporočilo ${i}`, elapsed: 9000 }, '9.9.9.9');
    assert.equal((await send({ name: 'Ana Novak', email: 'ana@primer.si', message: 'Še eno', elapsed: 9000 }, '9.9.9.9')).status, 200);
    assert.equal((await send({ name: 'Ana Novak', email: 'ana@primer.si', message: 'Preveč', elapsed: 9000 }, '9.9.9.9')).status, 429);

    assert.equal((await fetch(`${base}/api/inquiries`)).status, 401);
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'Geslo1234' }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const list = await (await fetch(`${base}/api/inquiries?status=new`, { headers: { cookie } })).json();
    assert.equal(list.length, 7);
    assert.ok(!list.some(r => r.name === 'Bot'));
    const first = list.find(r => r.company === 'Pekarna Novak');
    assert.equal(first.devices, 8);
    const dash = await (await fetch(`${base}/api/dashboard`, { headers: { cookie } })).json();
    assert.equal(dash.inquiries.length, 7);
    await fetch(`${base}/api/inquiries/${first.id}`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'done' }) });
    assert.equal((await (await fetch(`${base}/api/inquiries?status=new`, { headers: { cookie } })).json()).length, 6);
  } finally { srv.close(); }
});
