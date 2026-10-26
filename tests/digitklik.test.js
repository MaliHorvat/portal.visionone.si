// Uvoz cenika digitklik.si: lažni strežnik (fetch), razčlenitev, vpis, ponovni uvoz in arhiviranje
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

// skrita kartica: v komentarju brez notranjih komentarjev (komentarji se ne gnezdijo – tako kot na pravi strani)
const card = (id, slug, name, price, opts = {}) => (opts.hidden ? `<!-- ${rawCard(id, slug, name, price, opts).replace(/<!--[\s\S]*?-->/g, '')} -->` : rawCard(id, slug, name, price, opts));
const rawCard = (id, slug, name, price, { old, stock = '5', icons = [] } = {}) => `
<div class="col-lg-4"><!--SINGLE-FEATURED-PRODUCT START--><div class="single-featured-product"><div class="product_img">
<div class="info-holder"><p class="stock-style" >Zaloga : ${stock}</p></div><a href="${slug}"><img src="/imgs/x.png" alt="${name}" class="p-image"/></a>
<div class="add-cart-area"><div class="fet-price"><!-- --->${old ? `<span class="addcart-text-del" style="x">\n${old} €</span>` : ''}
<span class="addcart-text" style="x">${price == null ? '<a style="color:#fff;">Cena na povpraševanje</a>' : `\n\t\t${price} €\t\t`}</span></div>
<div class="wish"><a href="javascript:void(0);" onclick="ajaxcart.addItem(${id}, 1, 0)"></a><a href='javascript:updateCompareBox(${id}, "x");'></a></div></div></div>
<div class="infor-text"><a href="${slug}"><span>${name}</span></a><div class="gallery_icons">${icons.map(i => `<img src="/i.png" alt="${i}" title="${i}" />`).join('')}</div></div>
</div><!--SINGLE-FEATURED-PRODUCT END--></div>`;
const nav = crumbs => `<div class="category-gird-menu"><nav><ul><li><a href="/"><i class="fa fa-home"></i> Domov</a></li>${crumbs.map(([s, n]) => `<li><a href="${s}" class="txt5">${n}</a></li>`).join(' ')}</ul></nav></div>`;

let version = 1;
const site = () => ({
  '/sitemap.xml': `<urlset><url><loc>https://digitklik.si/</loc></url><url><loc>https://digitklik.si/kategorija_Video-nadzor</loc></url>
    <url><loc>https://digitklik.si/kategorija_IP-kamere-DOME</loc></url><url><loc>https://digitklik.si/kategorija_Vezice1</loc></url>
    <url><loc>https://digitklik.si/izdelek_X</loc></url></urlset>`,
  '/kategorija_Video-nadzor': nav([['kategorija_Video-nadzor', 'Video nadzor']]) + '<a href="category.php?category=2&amp;show=boxes">',
  '/category.php?category=2&show=table&range=0_5000': nav([['kategorija_Video-nadzor', 'Video nadzor']]), // nadrejena kategorija – brez izdelkov
  '/kategorija_IP-kamere-DOME': nav([['kategorija_Video-nadzor', 'Video nadzor'], ['kategorija_HD-IP', 'HD-IP video nadzor'], ['kategorija_IP-kamere-DOME', 'IP kamere DOME (fiksna leča)']])
    + '<a href="category.php?category=497&amp;show=table">', // brez piškotkov stran kategorije izdelkov ne prikaže
  '/category.php?category=497&show=table&range=0_5000': nav([['kategorija_Video-nadzor', 'Video nadzor'], ['kategorija_IP-kamere-DOME', 'IP kamere DOME (fiksna leča)']])
    + card(16899, 'izdelek_POLICEtech-D4339', 'POLICEtech IPC-D4339V-A-IL VIDEO NADZORNA KAMERA', version === 1 ? '51,35' : '61,00', { old: '79,00', stock: '200+', icons: ['4 Megapiksli', 'PoE napajanje'] })
    + card(16899, 'izdelek_POLICEtech-D4339', 'POLICEtech IPC-D4339V-A-IL VIDEO NADZORNA KAMERA', '51,35')
    + (version === 1 ? card(18472, 'izdelek_HiLook-D140', 'HiLook IPC-D140HA-LUC VIDEO NADZORNA KAMERA', '1.220,00') : '')
    + card(14312, 'izdelek_HIK-PDB', 'HIKVISION DS-PDB-IN-U NOSILEC', null, { stock: '15' })
    + card(99999, 'izdelek_Skrit', 'SKRIT IZDELEK', '10,00', { hidden: true }),
  '/kategorija_Vezice1': nav([['kategorija_Montazna', 'Montažna oprema'], ['kategorija_Vezice1', 'Vezice']]) + '<a href="category.php?category=1155&amp;show=table">',
  '/category.php?category=1155&show=table&range=0_5000': card(16229, 'izdelek_V-TAC-VEZICE', 'V-TAC KABELSKE VEZICE 3.5*150mm / SKU11165', '1,50'),
});
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = new URL(String(url));
  if (u.hostname !== 'digitklik.si') return realFetch(url, opts);
  const body = site()[u.pathname + u.search];
  return new Response(body ?? 'ni', { status: body == null ? 404 : 200 });
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-dk-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PASSWORD = 'Geslo1234';
delete process.env.DATABASE_URL;
const { default: handler } = await import('../api/handler.js');

test('uvoz cenika digitklik.si', async () => {
  const srv = http.createServer(handler);
  await new Promise(r => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  let cookie = '';
  const call = async (method, url, body) => {
    const r = await realFetch(base + url, { method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    return { status: r.status, data: await r.json() };
  };
  const run = async (opts) => {
    const st = (await call('POST', '/api/import/digitklik/start')).data;
    let left = [...st.categories];
    const tot = { inserted: 0, updated: 0, errors: [] };
    while (left.length) {
      const r = (await call('POST', '/api/import/digitklik/batch', { slugs: left.slice(0, 8), started: st.started, ...opts })).data;
      tot.inserted += r.inserted; tot.updated += r.updated; tot.errors.push(...r.errors);
      left = left.filter(s => !r.done.includes(s));
    }
    const fin = (await call('POST', '/api/import/digitklik/finish', { started: st.started, archive_missing: true, ...opts })).data;
    return { st, tot, fin };
  };
  try {
    await call('POST', '/api/auth/login', { username: 'admin', password: 'Geslo1234' });
    const a = await run({ margin: 25 });
    assert.deepEqual(a.st.categories, ['kategorija_Video-nadzor', 'kategorija_IP-kamere-DOME', 'kategorija_Vezice1']);
    assert.deepEqual(a.tot.errors, []);
    assert.equal(a.tot.inserted, 4); // 3 kamere/nosilec + vezice; skrit izdelek in podvojena kartica izpuščena
    let prods = (await call('GET', '/api/products?all=1&q=digitklik')).data;
    const cam = prods.find(p => p.sku === 'DK-16899');
    assert.equal(cam.category, 'Video nadzor › IP kamere DOME (fiksna leča)');
    assert.equal(cam.brand, 'POLICEtech');
    assert.equal(cam.equipment_type, 'camera');
    assert.equal(cam.purchase_price, 42.09); // 51,35 / 1,22
    assert.equal(cam.price, 52.61); // + 25 %
    assert.match(cam.description, /4 Megapiksli · PoE napajanje/);
    assert.match(cam.description, /zaloga 200\+/);
    assert.equal(prods.find(p => p.sku === 'DK-18472').purchase_price, 1000); // 1.220,00 z DDV
    assert.match(prods.find(p => p.sku === 'DK-14312').description, /cena na povpraševanje/);
    assert.ok(!prods.some(p => p.sku === 'DK-99999'));
    assert.equal(prods.find(p => p.sku === 'DK-16229').equipment_type, 'other');

    // ročno popravljena prodajna cena ostane, če cen ne posodabljamo
    await call('PUT', `/api/products/${cam.id}`, { price: 99 });
    version = 2;
    await new Promise(r => setTimeout(r, 1100)); // nova oznaka uvoza
    const b = await run({ margin: 25, update_prices: false });
    assert.equal(b.tot.inserted, 0);
    assert.equal(b.fin.archived, 1); // HiLook ga ni več
    prods = (await call('GET', '/api/products?all=1&q=digitklik')).data;
    const cam2 = prods.find(p => p.sku === 'DK-16899');
    assert.equal(cam2.purchase_price, 50); // 61,00 / 1,22
    assert.equal(cam2.price, 99);
    assert.equal(prods.find(p => p.sku === 'DK-18472').active, 0);

    const cats = (await call('GET', '/api/products/categories')).data.map(c => c.category);
    assert.ok(cats.includes('Montažna oprema › Vezice'));
    const st = (await call('GET', '/api/import/digitklik')).data;
    assert.equal(st.count, 3);
  } finally { srv.close(); }
});
