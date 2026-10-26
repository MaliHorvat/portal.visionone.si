// Uvoz kataloga z digitklik.si (Digital d.o.o.) – javni cenik, cene z DDV.
// Kategorije preberemo iz sitemap.xml, izdelke iz seznama posamezne kategorije (category.php … range=0_5000).
// Vljudno pajkanje: zaporedne zahteve z zamikom, brez slik in dolgih opisov (samo naziv, cena, zaloga, lastnosti).

export const BASE = 'https://digitklik.si';
const UA = 'Mozilla/5.0 (compatible; VisionOneField/1.1; +https://portal.visionone.si) katalog-uvoz';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function fetchText(url, { timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", euro: '€' };
export const decode = s => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(\w+|#39);/g, (m, k) => ENT[k] ?? m);
const text = s => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const priceOf = s => { const m = /([\d.]+,\d{2})\s*€/.exec(text(s)); return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null; };

/** Seznam kategorij iz sitemap.xml (poti brez domene, npr. "kategorija_Kamere2"). */
export async function listCategories() {
  const xml = await fetchText(`${BASE}/sitemap.xml`, { timeout: 30000 });
  const out = new Set();
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    const u = decode(m[1]);
    const mm = /^https?:\/\/(?:www\.)?digitklik\.si\/(kategorija_[^/?#]+)$/i.exec(u);
    if (mm) out.add(mm[1]);
  }
  return [...out];
}

/** Pot kategorij iz drobtinic (brez »Domov«). */
export function parseBreadcrumb(html) {
  const i = html.indexOf('category-gird-menu');
  if (i < 0) return [];
  const nav = html.slice(i, html.indexOf('</ul>', i));
  return [...nav.matchAll(/<a[^>]*href="(kategorija_[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ slug: m[1], name: text(m[2]) }));
}

export const categoryId = html => (/category\.php\?category=(\d+)/.exec(html) || [])[1] || null;

/** Izdelki s strani seznama. Kot brskalnik najprej odstranimo HTML komentarje – v njih so skriti (neaktivni) izdelki. */
export function parseProducts(html) {
  const out = new Map();
  const live = String(html).replace(/<!--[\s\S]*?-->/g, '');
  const parts = live.split(/<div class="single-featured-product">/).slice(1);
  for (const card of parts) {
    const id = (/ajaxcart\.addItem\((\d+)/.exec(card) || /updateCompareBox\((\d+)/.exec(card) || [])[1];
    const slug = (/href="(izdelek_[^"]+)"/.exec(card) || [])[1];
    if (!id || !slug || out.has(id)) continue;
    const nameHtml = (/<div class="infor-text"[\s\S]*?<span>([\s\S]*?)<\/span>/.exec(card) || [])[1]
      || (/alt="([^"]+)"\s+class="p-image"/.exec(card) || [])[1] || slug.replace(/^izdelek_/, '').replace(/-/g, ' ');
    const priceBlock = (/<div class="fet-price">([\s\S]*?)<\/div>/.exec(card) || [])[1] || '';
    const now = priceOf((/<span class="addcart-text"[^>]*>([\s\S]*?)<\/span>/.exec(priceBlock) || [])[1]) ?? priceOf(priceBlock);
    const old = priceOf((/<span class="addcart-text-del"[^>]*>([\s\S]*?)<\/span>/.exec(priceBlock) || [])[1]);
    const stock = text((/<p class="stock-style"[^>]*>([\s\S]*?)<\/p>/.exec(card) || [])[1]).replace(/^Zaloga\s*:\s*/i, '');
    const features = [...((/<div class="gallery_icons">([\s\S]*?)<\/div>/.exec(card) || [])[1] || '').matchAll(/\balt="([^"]*)"/g)]
      .map(m => decode(m[1]).trim()).filter(Boolean);
    const flags = [];
    if (/class="over over_sale"/.test(card)) flags.push('akcija');
    if (/class="over over_new"/.test(card)) flags.push('novo');
    out.set(id, { id, slug, url: `${BASE}/${slug}`, name: text(nameHtml), price: now, oldPrice: old && now && old > now ? old : null, stock, features, flags });
  }
  return [...out.values()];
}

/** Ena kategorija: pot + vsi izdelki. Stran kategorije brez piškotkov izdelkov ne prikaže,
 *  zato seznam vedno beremo iz category.php (vsi izdelki naenkrat). */
export async function crawlCategory(slug, { delay = 200 } = {}) {
  const html = await fetchText(`${BASE}/${slug}`);
  const path = parseBreadcrumb(html);
  const id = categoryId(html);
  let products = parseProducts(html);
  if (id) {
    await sleep(delay);
    const all = await fetchText(`${BASE}/category.php?category=${id}&show=table&range=0_5000`);
    const more = parseProducts(all);
    if (more.length >= products.length) products = more;
    if (!path.length) path.push(...parseBreadcrumb(all));
  }
  return { slug, id, path: path.map(p => p.name), products };
}

// ---------- pretvorba v izdelek kataloga ----------
const BRANDS = ['POLICEtech', 'HiLook', 'HIKVISION', 'Hikvision', 'DAHUA', 'Dahua', 'IMOU', 'Imou', 'REOLINK', 'Reolink', 'EZVIZ', 'Ezviz', 'UBIQUITI', 'Ubiquiti', 'MikroTik', 'Mikrotik', 'TP-LINK', 'TP-Link', 'GENWAY', 'Genway', 'Seagate', 'WD', 'Western', 'Toshiba', 'Uniview', 'UNV', 'Ajax', 'AJAX', 'Tenda', 'Cudy', 'Ruijie', 'Reyee', 'Teltonika', 'Zyxel', 'Netgear', 'APC', 'Eaton', 'Kingston', 'SanDisk', 'Lexar'];
export function guessBrand(name) {
  const first = String(name).trim().split(/\s+/)[0] || '';
  const hit = BRANDS.find(b => b.toLowerCase() === first.toLowerCase());
  if (hit) return hit;
  return /^[A-Z][A-Za-z0-9-]{1,14}$/.test(first) && !/^(IP|HD|LED|USB|POE|PoE|UTP|FTP|BNC|SD|HDD|SSD|UPS|DIN|RJ45|WiFi|Wi-Fi|4G|5G|LTE|SET|KIT|KOMPLET)$/i.test(first) ? first : null;
}

const TYPE_RULES = [
  [/wi-?fi kamer|kamere 4g|ip kamer|kamere\b|kamera|termaln|reg\. tablic|panoramsk|vrtljiv|skrit/i, 'camera'],
  [/nvr|dvr|snemalnik/i, 'nvr'],
  [/hdd|disk|sd kartic/i, 'disk'],
  [/poe|stikal|switch/i, 'switch'],
  [/usmerjeval|router|lte|4g \/ 5g/i, 'router'],
  [/dostopne točke|bridge|wifi most|ojačevalc/i, 'ap'],
  [/\bups\b/i, 'ups'],
  [/domofon|video zvonec|kukalo|interkom/i, 'intercom'],
  [/alarmne centrale|alarm/i, 'alarm'],
  [/senzor|detektor|bariere|sirene|magnetni/i, 'sensor'],
  [/pristop|prstni|obraz|ključk|kartice|zapornic/i, 'access'],
];
export function guessType(path, name) {
  const p = path.join(' / ');
  for (const [re, t] of TYPE_RULES) if (re.test(p)) return t;
  for (const [re, t] of TYPE_RULES) if (re.test(name)) return t;
  return 'other';
}

/** Kategorija za katalog: glavna skupina › zadnja podskupina (npr. »Video nadzor › IP kamere DOME (fiksna leča)«). */
export const categoryLabel = path => (path.length <= 1 ? path[0] || 'Digitklik' : `${path[0]} › ${path[path.length - 1]}`);

export function toProduct(p, path, { margin = 0, vat = 22 } = {}) {
  const onRequest = p.price == null;
  const net = onRequest ? 0 : Math.round((p.price / (1 + vat / 100)) * 100) / 100;
  const sell = Math.round(net * (1 + (Number(margin) || 0) / 100) * 100) / 100;
  const desc = [
    p.features.length ? p.features.join(' · ') : '',
    `Dobavitelj: digitklik.si${onRequest ? ' · cena na povpraševanje' : ''}${p.stock ? ` · zaloga ${p.stock}` : ''}${p.oldPrice ? ` · akcija (redno ${p.oldPrice.toFixed(2).replace('.', ',')} € z DDV)` : ''}`,
    p.url,
  ].filter(Boolean).join('\n');
  return {
    sku: `DK-${p.id}`, name: p.name.slice(0, 480), category: categoryLabel(path).slice(0, 180), brand: guessBrand(p.name),
    unit: 'kos', purchase_price: net, price: sell, vat, track_stock: 0, equipment_type: guessType(path, p.name), description: desc,
    supplier: 'digitklik', supplier_id: String(p.id), supplier_url: p.url, supplier_stock: p.stock || null, supplier_price: p.price,
  };
}
