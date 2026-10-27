// VisionOne Field – izračuni, številčenje, UPN QR in natisljivi dokumenti (ponudba, delovni nalog, račun, zapisnik, obvestilo)
import { q, getSetting, nextSeq } from './db.js';
import qrcode from './qrcode.mjs';

export const DOC_TYPES = { quote: 'Ponudba', workorder: 'Delovni nalog', invoice: 'Račun' };
export const STATUS = {
  quote: { draft: 'Osnutek', sent: 'Poslana', accepted: 'Sprejeta', rejected: 'Zavrnjena' },
  workorder: { open: 'Odprt', in_progress: 'V teku', done: 'Zaključen' },
  invoice: { draft: 'Osnutek', issued: 'Izdan', partial: 'Delno plačan', paid: 'Plačan', cancelled: 'Storniran' },
};
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function company() {
  return {
    name: 'Moje podjetje d.o.o.', address: '', post: '', city: '', tax_id: '', reg_no: '', vat_payer: 1, iban: '', bic: '', bank: '',
    email: '', phone: '', web: '', logo: null, payment_days: 8, quote_valid_days: 30, default_vat: 22, hourly_rate: 35,
    invoice_format: '{YYYY}-{NNNN}', quote_format: 'P-{YYYY}-{NNNN}', workorder_format: 'DN-{YYYY}-{NNNN}',
    footer: '', quote_note: 'Ponudba velja 30 dni. Cene so v EUR.', invoice_note: '', purpose_code: 'GDSV',
    ...(await getSetting('company', {}) || {}),
  };
}

export function calcTotals(lines, vatPayer = true) {
  const recap = new Map();
  let net = 0, vat = 0;
  const out = lines.map(l => {
    const qty = Number(l.qty) || 0, price = Number(l.price) || 0, disc = Number(l.discount) || 0;
    const rate = vatPayer ? Number(l.vat) || 0 : 0;
    const lineNet = r2(qty * price * (1 - disc / 100));
    const lineVat = r2(lineNet * rate / 100);
    net += lineNet; vat += lineVat;
    const rc = recap.get(rate) || { rate, base: 0, vat: 0 };
    rc.base = r2(rc.base + lineNet); rc.vat = r2(rc.vat + lineVat);
    recap.set(rate, rc);
    return { ...l, net: lineNet, vat_amount: lineVat, gross: r2(lineNet + lineVat) };
  });
  return { lines: out, total_net: r2(net), total_vat: r2(vat), total: r2(net + vat), recap: [...recap.values()].sort((a, b) => b.rate - a.rate) };
}

export async function nextNumber(type, year) {
  const seq = await nextSeq(type, year);
  const fmt = (await company())[`${type}_format`] || '{YYYY}-{NNNN}';
  const number = fmt.replace('{YYYY}', year).replace('{YY}', String(year).slice(2)).replace(/\{(N+)\}/, (_, n) => String(seq).padStart(n.length, '0'));
  return { seq, number };
}

// Sklic SI00: samo številke in največ dva vezaja
export function reference(number) {
  const r = String(number || '').replace(/[^0-9-]/g, '').replace(/^-+|-+$/g, '');
  return r ? `SI00 ${r}` : '';
}

// ---------- UPN QR (specifikacija ZBS: verzija 15, popravki M, ISO-8859-2, ECI 4) ----------
const ISO2 = { 'Č': 0xC8, 'č': 0xE8, 'Š': 0xA9, 'š': 0xB9, 'Ž': 0xAE, 'ž': 0xBE, 'Ć': 0xC6, 'ć': 0xE6, 'Đ': 0xD0, 'đ': 0xF0 };
const LATIN_OK = new Set('ÄäÖöÜüÉéÁáÍíÓóÚúßÂâÔôÇçËë'.split(''));
function toIso2(str) {
  let out = '';
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c < 128) out += ch;
    else if (ISO2[ch]) out += String.fromCharCode(ISO2[ch]);
    else if (LATIN_OK.has(ch)) out += String.fromCharCode(c);
    else out += '?';
  }
  return out;
}
const cut = (s, n) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

export function upnPayload({ payer = {}, amount, purposeCode = 'GDSV', purpose, due, iban, ref, recipient = {} }) {
  const fields = [
    'UPNQR', '', '', '', '',
    cut(payer.name, 33), cut(payer.address, 33), cut(payer.city, 33),
    String(Math.round(Number(amount) * 100)).padStart(11, '0'),
    '', '',
    cut(purposeCode, 4).toUpperCase(), cut(purpose, 42), due || '',
    String(iban || '').replace(/\s+/g, '').toUpperCase(), String(ref || '').replace(/\s+/g, '').slice(0, 26),
    cut(recipient.name, 33), cut(recipient.address, 33), cut(recipient.city, 33),
  ];
  let data = toIso2(fields.join('\n') + '\n');
  data += String(data.length).padStart(3, '0') + '\n';
  return data;
}

export function upnQrSvg(payload, cell = 2) {
  const qr = qrcode(15, 'M');
  const eci = { getMode: () => 7, getLength: () => 4, write: () => {} };
  const bytes = { getMode: () => 4, getLength: () => payload.length, write: buf => { for (let i = 0; i < payload.length; i++) buf.put(payload.charCodeAt(i) & 0xff, 8); } };
  qr.addSegment(eci);
  qr.addSegment(bytes);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin: 2 * cell, scalable: true });
}

// ---------- HTML za tiskanje ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const qty = n => new Intl.NumberFormat('sl-SI', { maximumFractionDigits: 3 }).format(Number(n) || 0);
export const dateSl = d => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('sl-SI') : '');

const PRINT_CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.4 "Segoe UI", "DejaVu Sans", Arial, sans-serif; color: #1a2330; margin: 0; background: #e9edf1; }
.sheet { background: #fff; max-width: 210mm; margin: 12px auto; padding: 14mm; box-shadow: 0 4px 20px rgba(0,0,0,.12); }
@media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; } .noprint { display: none !important; } }
.bar { position: sticky; top: 0; background: #1d2733; color: #fff; padding: 10px 16px; display: flex; gap: 10px; align-items: center; z-index: 5; }
.bar button { font: inherit; padding: 7px 14px; border-radius: 6px; border: 0; background: #1a4677; color: #fff; cursor: pointer; }
.bar span { flex: 1; }
.head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 22px; }
.head img { max-height: 60px; max-width: 220px; }
.v1logo { display: inline-flex; align-items: center; gap: 8px; } .v1logo img:first-child { height: 40px; } .v1logo img:last-child { height: 17px; }
.co { text-align: right; font-size: 9pt; color: #4b5866; }
.co strong { color: #1a2330; font-size: 11pt; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
.box { border: 1px solid #d5dce3; border-radius: 6px; padding: 10px 12px; }
.box .lbl { font-size: 8.5pt; color: #6b7785; margin-bottom: 4px; }
h1 { font-size: 18pt; margin: 0 0 4px; font-weight: 600; letter-spacing: -.01em; }
.meta { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; font-size: 9.5pt; }
.meta dt { color: #6b7785; } .meta dd { margin: 0; }
table.lines { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 9.5pt; }
table.lines th { text-align: left; font-weight: 600; border-bottom: 1.5px solid #1a2330; padding: 6px 6px; font-size: 8.5pt; color: #4b5866; }
table.lines td { border-bottom: 1px solid #e3e8ed; padding: 6px 6px; vertical-align: top; }
table.lines .n { text-align: right; white-space: nowrap; }
.totals { margin-left: auto; width: 300px; font-size: 10pt; }
.totals div { display: flex; justify-content: space-between; padding: 3px 0; }
.totals .grand { border-top: 1.5px solid #1a2330; margin-top: 4px; padding-top: 6px; font-size: 13pt; font-weight: 700; }
.recap { font-size: 8.5pt; color: #4b5866; margin-top: 6px; }
.note { margin-top: 18px; font-size: 9.5pt; white-space: pre-wrap; }
.foot { margin-top: 26px; padding-top: 8px; border-top: 1px solid #d5dce3; font-size: 8pt; color: #6b7785; }
.pay { display: flex; gap: 18px; align-items: center; margin-top: 18px; border: 1px solid #d5dce3; border-radius: 6px; padding: 10px 12px; break-inside: avoid; }
.pay svg { width: 38mm; height: 38mm; flex: none; }
.sig { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; break-inside: avoid; }
.sig div { border-top: 1px solid #1a2330; padding-top: 4px; font-size: 9pt; color: #4b5866; }
.sig img { max-height: 60px; display: block; margin-bottom: 4px; }
.photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.photos img { width: 100%; height: 45mm; object-fit: cover; border-radius: 4px; }
h2 { font-size: 12pt; margin: 18px 0 6px; }
.notice { text-align: center; border: 3mm solid #1a2330; border-radius: 6mm; padding: 14mm 12mm; }
.notice h1 { font-size: 34pt; margin: 6mm 0; letter-spacing: .02em; }
.notice .cam { width: 70mm; height: 46mm; margin: 0 auto; }
.notice p { font-size: 12.5pt; margin: 3mm 0; }
@media screen and (max-width: 640px) {
  .sheet { margin: 0; padding: 18px 14px 28px; box-shadow: none; }
  .bar { flex-wrap: wrap; padding: 8px 12px; }
  .bar span { flex-basis: 100%; font-size: 10pt; }
  .head { flex-direction: column; gap: 10px; }
  .co { text-align: left; }
  .parties { grid-template-columns: 1fr; gap: 14px; }
  h1 { font-size: 15pt; overflow-wrap: anywhere; }
  .meta dd { white-space: nowrap; }
  table.lines { font-size: 9pt; }
  table.lines th, table.lines td { padding: 5px 3px; }
  table.lines td:not(.n) { overflow-wrap: anywhere; }
  .totals { width: 100%; }
  .pay { flex-direction: column; align-items: flex-start; }
  .sig { grid-template-columns: 1fr; gap: 30px; }
  .photos { grid-template-columns: repeat(2, 1fr); }
  .notice { border-width: 2mm; padding: 8mm 5mm; }
  .notice h1 { font-size: 22pt; }
}
.notice .small { font-size: 10pt; color: #333; margin-top: 8mm; text-align: left; }
`;

function shell(title, body, { back = true } = {}) {
  return `<!doctype html><html lang="sl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>
<div class="bar noprint"><span>${esc(title)}</span>${back ? '<button onclick="history.length>1?history.back():window.close()" style="background:#3a4756">Nazaj</button>' : ''}<button onclick="window.print()">Natisni / shrani PDF</button></div>
<div class="sheet">${body}</div></body></html>`;
}

function companyHead(c) {
  return `<div class="head"><div>${c.logo ? `<img src="${esc(c.logo)}" alt="">` : /visionone/i.test(c.name || '') ? `<span class="v1logo"><img src="/brand/mark.png" alt=""><img src="/brand/wordmark.png" alt="VisionOne"></span>` : `<strong style="font-size:15pt">${esc(c.name)}</strong>`}</div>
  <div class="co"><strong>${esc(c.name)}</strong><br>${esc(c.address)}<br>${esc([c.post, c.city].filter(Boolean).join(' '))}<br>
  ${c.tax_id ? `${c.vat_payer ? 'ID za DDV' : 'Davčna št.'}: ${esc(c.vat_payer && !/^SI/i.test(c.tax_id) ? 'SI' + c.tax_id : c.tax_id)}<br>` : ''}${c.reg_no ? `Matična št.: ${esc(c.reg_no)}<br>` : ''}
  ${[c.phone, c.email, c.web].filter(Boolean).map(esc).join(' · ')}</div></div>`;
}
function customerBox(cu, label = 'Naročnik') {
  if (!cu) return `<div class="box"><div class="lbl">${label}</div>–</div>`;
  return `<div class="box"><div class="lbl">${label}</div><strong>${esc(cu.name)}</strong><br>${esc(cu.address)}<br>${esc([cu.post, cu.city].filter(Boolean).join(' '))}
  ${cu.tax_id ? `<br>${cu.vat_payer ? 'ID za DDV' : 'Davčna št.'}: ${esc(cu.vat_payer && !/^SI/i.test(cu.tax_id) ? 'SI' + cu.tax_id : cu.tax_id)}` : ''}</div>`;
}

export async function renderDocument(id) {
  const d = await q.get('SELECT * FROM documents WHERE id=?', id);
  if (!d) return null;
  const c = await company();
  const cu = d.customer_json ? JSON.parse(d.customer_json) : await q.get('SELECT * FROM customers WHERE id=?', d.customer_id);
  const site = d.site_id ? await q.get('SELECT * FROM sites WHERE id=?', d.site_id) : null;
  const lines = await q.all('SELECT * FROM doc_lines WHERE document_id=? ORDER BY sort, id', id);
  const vatPayer = !!c.vat_payer;
  const t = calcTotals(lines, vatPayer);
  const title = d.type === 'invoice' ? (d.status === 'draft' ? 'Predračun' : 'Račun') : DOC_TYPES[d.type];
  const meta = [];
  if (d.number) meta.push(['Številka', d.number]);
  meta.push([d.type === 'invoice' ? 'Datum izdaje' : 'Datum', dateSl(d.date)]);
  if (d.type === 'invoice') { meta.push(['Datum opravljene storitve', dateSl(d.service_date || d.date)]); meta.push(['Rok plačila', dateSl(d.due_date)]); }
  if (d.type === 'quote' && d.valid_until) meta.push(['Velja do', dateSl(d.valid_until)]);
  if (d.type === 'workorder' && d.technician) meta.push(['Izvajalec', d.technician]);
  if (site) meta.push(['Objekt', [site.name, site.address, site.city].filter(Boolean).join(', ')]);
  if (d.reference && d.type === 'invoice') meta.push(['Sklic', d.reference]);
  const showDisc = lines.some(l => Number(l.discount));
  const rows = t.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td class="n">${qty(l.qty)} ${esc(l.unit)}</td><td class="n">${money(l.price)}</td>${showDisc ? `<td class="n">${l.discount ? qty(l.discount) + ' %' : ''}</td>` : ''}${vatPayer ? `<td class="n">${qty(l.vat)} %</td>` : ''}<td class="n">${money(l.net)}</td></tr>`).join('');
  let body = companyHead(c);
  body += `<div class="parties">${customerBox(cu, d.type === 'invoice' ? 'Kupec' : 'Naročnik')}<div><h1>${esc(title)} ${esc(d.number || '')}</h1><dl class="meta">${meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div></div>`;
  if (d.title) body += `<p><strong>${esc(d.title)}</strong></p>`;
  if (d.type === 'workorder' && d.work_description) body += `<h2>Opis del</h2><div class="note" style="margin-top:0">${esc(d.work_description)}</div>`;
  if (lines.length) {
    body += `<table class="lines"><thead><tr><th>#</th><th>Opis</th><th class="n">Količina</th><th class="n">Cena</th>${showDisc ? '<th class="n">Popust</th>' : ''}${vatPayer ? '<th class="n">DDV</th>' : ''}<th class="n">Znesek</th></tr></thead><tbody>${rows}</tbody></table>`;
    body += `<div class="totals"><div><span>Skupaj brez DDV</span><span>${money(t.total_net)} €</span></div>${vatPayer ? t.recap.map(r => `<div><span>DDV ${qty(r.rate)} % od ${money(r.base)}</span><span>${money(r.vat)} €</span></div>`).join('') : ''}
    <div class="grand"><span>Za plačilo</span><span>${money(t.total)} €</span></div>${d.paid > 0 && d.type === 'invoice' ? `<div><span>Plačano</span><span>${money(d.paid)} €</span></div><div><span>Odprto</span><span>${money(t.total - d.paid)} €</span></div>` : ''}</div>`;
    if (!vatPayer) body += `<p class="recap">DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1.</p>`;
  }
  const note = d.notes || (d.type === 'quote' ? c.quote_note : d.type === 'invoice' ? c.invoice_note : '');
  if (note) body += `<div class="note">${esc(note)}</div>`;
  if (d.type === 'invoice' && d.status !== 'draft' && c.iban && t.total - (d.paid || 0) > 0) {
    let qrSvg = '';
    try {
      qrSvg = upnQrSvg(upnPayload({
        payer: { name: cu?.name, address: cu?.address, city: [cu?.post, cu?.city].filter(Boolean).join(' ') },
        amount: r2(t.total - (d.paid || 0)), purposeCode: c.purpose_code || 'GDSV', purpose: `Plačilo računa ${d.number}`, due: dateSl(d.due_date),
        iban: c.iban, ref: d.reference || reference(d.number), recipient: { name: c.name, address: c.address, city: [c.post, c.city].filter(Boolean).join(' ') },
      }));
    } catch (e) { qrSvg = ''; }
    body += `<div class="pay">${qrSvg}<div><strong>Podatki za plačilo</strong><br>Prejemnik: ${esc(c.name)}<br>IBAN: ${esc(c.iban)}${c.bic ? ` · BIC: ${esc(c.bic)}` : ''}${c.bank ? ` (${esc(c.bank)})` : ''}<br>Sklic: ${esc(d.reference || reference(d.number))}<br>Znesek: <strong>${money(t.total - (d.paid || 0))} €</strong> · Rok: ${esc(dateSl(d.due_date))}<br><span style="color:#6b7785;font-size:8.5pt">Kodo UPN QR skenirajte z mobilno banko.</span></div></div>`;
  }
  if (d.type === 'workorder') {
    const photos = await q.all("SELECT id FROM files WHERE document_id=? AND mime LIKE 'image/%'", id);
    if (photos.length) body += `<h2>Fotografije</h2><div class="photos">${photos.map(p => `<img src="/api/files/${p.id}" alt="">`).join('')}</div>`;
    body += `<div class="sig"><div>Izvajalec: ${esc(d.technician || '')}</div><div>${d.signature ? `<img src="${esc(d.signature)}" alt="Podpis">` : ''}Naročnik: ${esc(d.signed_name || '')}${d.signed_at ? `, ${new Date(d.signed_at * 1000).toLocaleString('sl-SI')}` : ''}</div></div>`;
  } else if (d.type === 'quote') {
    body += `<div class="sig"><div>Pripravil: ${esc(d.created_by || '')}</div><div>Ponudbo sprejemam (podpis in žig naročnika)</div></div>`;
  } else {
    body += `<p style="margin-top:20px;font-size:9.5pt">Račun izdal: ${esc(d.created_by || '')}</p>`;
  }
  if (c.footer) body += `<div class="foot">${esc(c.footer)}</div>`;
  return shell(`${title} ${d.number || ''}`.trim(), body);
}

// ---------- Zapisnik o predaji sistema ----------
export const EQUIP_TYPES = { camera: 'Kamera', nvr: 'Snemalnik (NVR/DVR)', disk: 'Trdi disk', switch: 'Stikalo (PoE)', router: 'Usmerjevalnik', ups: 'UPS', intercom: 'Domofon', alarm: 'Alarmna centrala', sensor: 'Senzor / javljalnik', access: 'Kontrola pristopa', monitor: 'Monitor', ap: 'Dostopna točka (Wi-Fi)', other: 'Drugo' };
export async function renderHandover(siteId, { passwords = false } = {}) {
  const s = await q.get('SELECT * FROM sites WHERE id=?', siteId);
  if (!s) return null;
  const cu = await q.get('SELECT * FROM customers WHERE id=?', s.customer_id);
  const c = await company();
  const eq = await q.all('SELECT * FROM equipment WHERE site_id=? ORDER BY type, name', siteId);
  let body = companyHead(c);
  body += `<h1>Zapisnik o predaji sistema</h1><p style="color:#4b5866">Datum: ${new Date().toLocaleDateString('sl-SI')}</p>`;
  body += `<div class="parties">${customerBox(cu)}<div class="box"><div class="lbl">Objekt</div><strong>${esc(s.name)}</strong><br>${esc(s.address)}<br>${esc([s.post, s.city].filter(Boolean).join(' '))}${s.system_type ? `<br>Sistem: ${esc(s.system_type)}` : ''}</div></div>`;
  body += `<h2>Vgrajena oprema</h2><table class="lines"><thead><tr><th>#</th><th>Vrsta</th><th>Naziv / model</th><th>Serijska št.</th><th>IP</th><th>Lokacija</th><th>Garancija do</th>${passwords ? '<th>Uporabnik / geslo</th>' : ''}</tr></thead><tbody>`;
  eq.forEach((e, i) => {
    const pw = passwords ? (() => { try { return decryptLazy(e.password_enc); } catch { return ''; } })() : '';
    body += `<tr><td>${i + 1}</td><td>${esc(EQUIP_TYPES[e.type] || e.type)}</td><td>${esc([e.name, e.brand, e.model].filter(Boolean).join(' · '))}</td><td>${esc(e.serial)}</td><td>${esc(e.ip)}</td><td>${esc(e.location)}</td><td>${esc(dateSl(e.warranty_until))}</td>${passwords ? `<td>${esc(e.username || '')}${pw ? ` / ${esc(pw)}` : ''}</td>` : ''}</tr>`;
  });
  body += '</tbody></table>';
  body += `<h2>Izjava</h2><div class="note" style="margin-top:0">Naročnik potrjuje, da je bil sistem predan v delovanju, da je bil seznanjen z uporabo (živa slika, pregled posnetkov, izvoz) in da je prejel dostopne podatke. Naročnik je seznanjen, da je kot upravljavec videonadzornega sistema dolžan zagotoviti skladnost z ZVOP-2 in GDPR (obvestilo o videonadzoru, evidenca dejavnosti obdelave, rok hrambe posnetkov).${passwords ? '\n\nZapisnik vsebuje gesla – hranite ga na varnem.' : ''}</div>`;
  body += `<div class="sig"><div>Predal (izvajalec): ${esc(c.name)}</div><div>Prevzel (naročnik)</div></div>`;
  if (c.footer) body += `<div class="foot">${esc(c.footer)}</div>`;
  return shell(`Zapisnik o predaji – ${s.name}`, body);
}
let decryptLazy = () => '';
export function setDecrypt(fn) { decryptLazy = fn; }

// ---------- Obvestilo o videonadzoru (ZVOP-2) ----------
export async function renderNotice(siteId, opts = {}) {
  const s = await q.get('SELECT * FROM sites WHERE id=?', siteId);
  if (!s) return null;
  const cu = await q.get('SELECT * FROM customers WHERE id=?', s.customer_id);
  const controller = opts.controller || cu?.name || '';
  const contact = opts.contact || [cu?.phone, cu?.email].filter(Boolean).join(', ');
  const cam = `<svg class="cam" viewBox="0 0 120 80" aria-hidden="true"><rect x="8" y="22" width="70" height="36" rx="6" fill="#1a2330"/><path d="M78 32l30-14v44l-30-14z" fill="#1a2330"/><circle cx="34" cy="40" r="11" fill="#fff"/><circle cx="34" cy="40" r="6" fill="#1a2330"/><rect x="20" y="58" width="10" height="16" fill="#1a2330"/></svg>`;
  const body = `<div class="notice">${cam}<h1>VIDEONADZOR</h1>
  <p>Ta prostor je pod videonadzorom.</p>
  <p><strong>Upravljavec:</strong> ${esc(controller)}${cu?.address ? `, ${esc(cu.address)}, ${esc([cu.post, cu.city].filter(Boolean).join(' '))}` : ''}</p>
  ${contact ? `<p><strong>Kontakt za uveljavljanje pravic:</strong> ${esc(contact)}</p>` : ''}
  <div class="small">
  <p><strong>Namen:</strong> ${esc(opts.purpose || 'varovanje ljudi in premoženja')}</p>
  <p><strong>Rok hrambe posnetkov:</strong> ${esc(opts.retention || '30 dni')}</p>
  ${opts.dpo ? `<p><strong>Pooblaščena oseba za varstvo podatkov:</strong> ${esc(opts.dpo)}</p>` : ''}
  <p>Posameznik ima pravico do dostopa do posnetkov, ki se nanašajo nanj, ter druge pravice po Splošni uredbi o varstvu podatkov (GDPR). Dodatne informacije so na voljo pri upravljavcu.</p>
  </div></div>
  <p class="noprint" style="color:#6b7785;font-size:9pt;margin-top:10px">Obvestilo namestite tako, da je vidno pred vstopom v nadzorovano območje. Vsebino preverite glede na veljavno zakonodajo (ZVOP-2) in posebnosti objekta.</p>`;
  return shell(`Obvestilo o videonadzoru – ${s.name}`, body);
}

export { esc, money };
