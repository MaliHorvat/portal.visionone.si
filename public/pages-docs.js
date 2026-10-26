// VisionOne Field – ponudbe, delovni nalogi in računi
import { h, clear, icon, get, post, put, del, toast, toastErr, modal, confirmDialog, field, select, toggle, emptyState, debounce } from './lib/core.js';
import { F, money, dateSl, todayIso, head, go, reload, downscale } from './app.js';

const SLUG = { ponudbe: 'quote', nalogi: 'workorder', racuni: 'invoice' };
const SLUG_OF = { quote: 'ponudbe', workorder: 'nalogi', invoice: 'racuni' };
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ======================= SEZNAM =======================
export async function pageDocuments(page, slug) {
  const type = SLUG[slug] || 'invoice';
  const tabs = h('div', { class: 'tabs' }, Object.entries(SLUG).map(([s, t]) => h('button', { 'aria-selected': String(t === type), onclick: () => go(`/dokumenti/${s}`) }, F.meta.doc_types[t] === 'Delovni nalog' ? 'Delovni nalogi' : F.meta.doc_types[t] === 'Ponudba' ? 'Ponudbe' : 'Računi')));
  const search = h('input', { type: 'search', placeholder: 'Išči po številki, stranki, naslovu', style: { maxWidth: '340px' } });
  const status = select([['', 'Vsa stanja'], ...Object.entries(F.meta.status[type])], '', { style: { width: 'auto' } });
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  const year = select([['', 'Vsa leta'], ...years.map(y => [y, y])], '', { style: { width: 'auto' } });
  const list = h('div', { class: 'list' });
  const sum = h('span', { class: 'muted' });
  const load = async () => {
    const p = new URLSearchParams({ type });
    if (search.value) p.set('q', search.value);
    if (status.value) p.set('status', status.value);
    if (year.value) p.set('year', year.value);
    const rows = await get(`/api/documents?${p}`);
    const total = rows.filter(r => r.status !== 'cancelled').reduce((a, r) => a + r.total, 0);
    sum.textContent = `${rows.length} dokumentov · ${money(total)}`;
    clear(list, rows.length ? rows.map(d => {
      const overdue = d.type === 'invoice' && ['issued', 'partial'].includes(d.status) && d.due_date < todayIso();
      return h('a', { class: 'list-item', href: `#/dokument/${d.id}` },
        h('div', { class: 'main' }, h('strong', {}, `${d.number || 'Osnutek'} · ${d.customer_name || '–'}`), h('small', {}, [dateSl(d.date), d.title, d.site_name].filter(Boolean).join(' · '))),
        h('div', { class: 'end' }, money(d.total), h('small', { style: { color: overdue ? 'var(--alarm)' : d.status === 'paid' || d.status === 'accepted' || d.status === 'done' ? 'var(--ok)' : '' } }, overdue ? `zapadel ${dateSl(d.due_date)}` : F.meta.status[d.type][d.status])));
    }) : [emptyState('Ni dokumentov', 'Ustvarite nov dokument ali spremenite filtre.')]);
  };
  search.oninput = debounce(load, 250);
  status.onchange = load; year.onchange = load;
  clear(page, head('Dokumenti', null,
    type === 'invoice' ? h('a', { class: 'btn hide-m', href: `/api/export/invoices.csv?year=${new Date().getFullYear()}` }, icon('download', 16), 'Knjiga računov (CSV)') : null,
    h('button', { class: 'btn btn-primary', onclick: () => newDocument(type) }, icon('plus', 16), `Nov${type === 'quote' ? 'a ponudba' : type === 'workorder' ? ' delovni nalog' : ' račun'}`)),
    tabs, h('div', { class: 'row', style: { marginBottom: '12px' } }, search, status, year, h('span', { class: 'spacer' }), sum), list);
  load();
}

// ======================= NOV DOKUMENT =======================
export async function newDocument(type, preset = {}) {
  if (preset.customer_id) {
    const r = await post('/api/documents', { type, ...preset, lines: [] }).catch(toastErr);
    if (r) go(`/dokument/${r.id}`);
    return;
  }
  const customers = await get('/api/customers');
  if (!customers.length) { toast('Najprej dodajte stranko', 'warn'); go('/stranke'); return; }
  const search = h('input', { type: 'search', placeholder: 'Poišči stranko …' });
  const list = h('div', { class: 'list', style: { maxHeight: '50vh', overflow: 'auto' } });
  let dlg;
  const render = () => {
    const s = search.value.toLowerCase();
    clear(list, customers.filter(c => !s || `${c.name} ${c.city || ''}`.toLowerCase().includes(s)).slice(0, 100).map(c => h('button', { class: 'list-item', style: { width: '100%', border: 0, background: 'none', font: 'inherit', textAlign: 'left' }, onclick: async () => {
      const sites = (await get(`/api/customers/${c.id}`)).sites;
      const r = await post('/api/documents', { type, customer_id: c.id, site_id: sites.length === 1 ? sites[0].id : null, lines: [] });
      dlg.close(); go(`/dokument/${r.id}`);
    } }, h('div', { class: 'main' }, h('strong', {}, c.name), h('small', {}, c.city || '')))));
  };
  search.oninput = render;
  dlg = modal(`${F.meta.doc_types[type]} – izberite stranko`, h('div', {}, search, h('div', { style: { height: '10px' } }), list));
  render();
}

// ======================= UREJANJE DOKUMENTA =======================
export async function pageDocument(page, id) {
  const d = await get(`/api/documents/${id}`);
  const customer = await get(`/api/customers/${d.customer_id}`);
  const T = F.meta.doc_types[d.type];
  const locked = d.type === 'invoice' && d.status !== 'draft';
  const vatPayer = !!F.company.vat_payer;
  let lines = d.lines.map(l => ({ ...l }));
  let dirty = false;
  const markDirty = () => { dirty = true; saveBtn.disabled = false; saveBtn.textContent = 'Shrani'; };

  // ---- glava ----
  const siteSel = select([['', '– brez objekta –'], ...customer.sites.map(s => [s.id, s.name])], d.site_id || '', { disabled: locked, onchange: markDirty });
  const date = h('input', { type: 'date', value: d.date || todayIso(), disabled: locked, onchange: markDirty });
  const title = h('input', { value: d.title || '', placeholder: d.type === 'workorder' ? 'npr. Servis kamer' : 'npr. Videonadzor skladišča', disabled: locked, oninput: markDirty });
  const due = h('input', { type: 'date', value: d.due_date || '', disabled: locked, onchange: markDirty });
  const service = h('input', { type: 'date', value: d.service_date || '', disabled: locked, onchange: markDirty });
  const valid = h('input', { type: 'date', value: d.valid_until || '', onchange: markDirty });
  const tech = h('input', { value: d.technician || '', oninput: markDirty });
  const notes = h('textarea', { placeholder: d.type === 'quote' ? F.company.quote_note : d.type === 'invoice' ? F.company.invoice_note : 'Opombe' , oninput: markDirty }, d.notes || '');
  const work = h('textarea', { rows: 5, placeholder: 'Opis opravljenega dela, ugotovitve, priporočila …', oninput: markDirty }, d.work_description || '');
  const headFields = h('div', { class: 'doc-head' },
    field('Stranka', h('a', { href: `#/stranka/${d.customer_id}`, style: { lineHeight: '40px' } }, d.customer_name)),
    field('Objekt', siteSel), field(d.type === 'invoice' ? 'Datum izdaje' : 'Datum', date), field('Naslov / predmet', title),
    d.type === 'invoice' ? field('Datum opravljene storitve', service) : null,
    d.type === 'invoice' ? field('Rok plačila', due) : null,
    d.type === 'quote' ? field('Velja do', valid) : null,
    d.type === 'workorder' ? field('Izvajalec', tech) : null);

  // ---- postavke ----
  const tbody = h('tbody');
  const totalsBox = h('div', { class: 'totals-box' });
  const calc = () => {
    let net = 0; const rec = {};
    for (const l of lines) {
      const n = r2((Number(l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.discount) || 0) / 100));
      const rate = vatPayer ? Number(l.vat) || 0 : 0;
      net += n; rec[rate] = rec[rate] || { base: 0, vat: 0 }; rec[rate].base += n; rec[rate].vat += r2(n * rate / 100);
      l._net = n;
    }
    const vat = Object.values(rec).reduce((a, r) => a + r.vat, 0);
    clear(totalsBox, h('div', {}, h('span', {}, 'Osnova'), h('span', {}, money(net))),
      vatPayer ? Object.entries(rec).sort((a, b) => b[0] - a[0]).map(([rate, r]) => h('div', { class: 'muted' }, h('span', {}, `DDV ${rate} %`), h('span', {}, money(r.vat)))) : h('div', { class: 'muted' }, h('span', {}, 'DDV ni obračunan (94. člen ZDDV-1)'), h('span', {}, '')),
      h('div', { class: 'grand' }, h('span', {}, 'Skupaj'), h('span', {}, money(net + vat))),
      d.type === 'invoice' && d.paid > 0 ? [h('div', {}, h('span', {}, 'Plačano'), h('span', {}, money(d.paid))), h('div', {}, h('strong', {}, 'Odprto'), h('strong', {}, money(net + vat - d.paid)))] : null);
    for (const l of lines) l._totEl && (l._totEl.textContent = money(l._net));
  };
  const renderLines = () => {
    clear(tbody, lines.map((l, i) => {
      const inp = (k, attrs = {}) => h('input', { value: l[k] ?? '', disabled: locked, ...attrs, oninput: e => { l[k] = attrs.type === 'number' ? Number(e.target.value) : e.target.value; calc(); markDirty(); } });
      const desc = productInput(l, () => { renderLines(); calc(); markDirty(); }, locked);
      l._totEl = h('span');
      return h('tr', {},
        h('td', { class: 'desc' }, desc),
        h('td', { class: 'n', 'data-l': 'Količina', style: { width: '90px' } }, inp('qty', { type: 'number', step: 'any', inputmode: 'decimal', 'aria-label': 'Količina' })),
        h('td', { 'data-l': 'Enota', style: { width: '80px' } }, inp('unit', { 'aria-label': 'Enota', list: 'units' })),
        h('td', { class: 'n', 'data-l': 'Cena €', style: { width: '110px' } }, inp('price', { type: 'number', step: 'any', inputmode: 'decimal', 'aria-label': 'Cena' })),
        h('td', { class: 'n', 'data-l': 'Popust %', style: { width: '80px' } }, inp('discount', { type: 'number', step: 'any', inputmode: 'decimal', 'aria-label': 'Popust %', placeholder: '0' })),
        vatPayer ? h('td', { 'data-l': 'DDV', style: { width: '90px' } }, select([[22, '22 %'], [9.5, '9,5 %'], [5, '5 %'], [0, '0 %']], l.vat ?? 22, { disabled: locked, 'aria-label': 'DDV', onchange: e => { l.vat = Number(e.target.value); calc(); markDirty(); } })) : null,
        h('td', { class: 'tot', 'data-l': 'Znesek', style: { width: '110px' } }, l._totEl),
        h('td', { class: 'del', style: { width: '40px' } }, locked ? null : h('button', { class: 'btn-icon', 'aria-label': 'Odstrani vrstico', onclick: () => { lines.splice(i, 1); renderLines(); calc(); markDirty(); } }, icon('x', 16))));
    }));
    calc();
  };
  const addLine = (l = {}) => { lines.push({ description: '', qty: 1, unit: 'kos', price: 0, discount: 0, vat: F.company.default_vat ?? 22, ...l }); renderLines(); markDirty(); setTimeout(() => tbody.querySelector('tr:last-child input')?.focus(), 30); };
  const linesTable = h('div', {},
    h('table', { class: 'lines-ed' }, h('thead', {}, h('tr', {}, h('th', {}, 'Opis (začnite tipkati za iskanje v katalogu)'), h('th', { class: 'n' }, 'Kol.'), h('th', {}, 'Enota'), h('th', { class: 'n' }, 'Cena'), h('th', { class: 'n' }, 'Pop. %'), vatPayer ? h('th', {}, 'DDV') : null, h('th', { style: { textAlign: 'right' } }, 'Znesek'), h('th', {}))), tbody),
    h('datalist', { id: 'units' }, ['kos', 'ura', 'm', 'km', 'kpl', 'pavšal', 'dan'].map(u => h('option', { value: u }))),
    locked ? null : h('div', { class: 'btn-row', style: { marginTop: '8px' } },
      h('button', { class: 'btn btn-sm', onclick: () => addLine() }, icon('plus', 14), 'Vrstica'),
      h('button', { class: 'btn btn-sm', onclick: () => addLine({ description: 'Delo serviserja', unit: 'ura', price: F.company.hourly_rate || 35 }) }, '+ Ura dela'),
      h('button', { class: 'btn btn-sm', onclick: async () => { const km = prompt('Število prevoženih kilometrov'); if (km) { const found = await get('/api/products?q=PREVOZ&limit=50'); const p = found.find(x => x.sku === 'PREVOZ') || found[0]; addLine({ description: 'Prevozni stroški', unit: 'km', qty: Number(km), price: p?.price ?? 0.5, product_id: p?.id }); } } }, '+ Prevoz')),
    totalsBox);
  renderLines();

  // ---- shranjevanje ----
  const payload = () => ({
    site_id: siteSel.value ? Number(siteSel.value) : null, date: date.value, title: title.value, due_date: due.value || null, service_date: service.value || null,
    valid_until: valid.value || null, technician: tech.value, notes: notes.value, work_description: work.value,
    lines: lines.map(({ _net, _totEl, ...l }) => l),
  });
  const save = async (quiet = false) => {
    if (locked) { await put(`/api/documents/${id}`, { notes: notes.value }); if (!quiet) toast('Opombe so shranjene'); return; }
    await put(`/api/documents/${id}`, payload());
    dirty = false; saveBtn.disabled = true; saveBtn.textContent = 'Shranjeno';
    if (!quiet) toast('Shranjeno');
  };
  const saveBtn = h('button', { class: 'btn btn-primary', disabled: true, onclick: () => save().catch(toastErr) }, 'Shranjeno');
  const guard = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', guard);
  const onHash = () => { if (dirty) save(true).catch(() => {}); window.removeEventListener('hashchange', onHash); window.removeEventListener('beforeunload', guard); };
  window.addEventListener('hashchange', onHash);
  const act = (label, fn, kind = '') => h('button', { class: `btn ${kind}`, onclick: async e => { e.target.disabled = true; try { if (dirty) await save(true); await fn(); } catch (er) { toastErr(er); } finally { e.target.disabled = false; } } }, label);

  // ---- dejanja glede na vrsto in stanje ----
  const statusSel = !locked && d.type !== 'invoice' ? select(Object.entries(F.meta.status[d.type]), d.status, { style: { width: 'auto' }, 'aria-label': 'Stanje', onchange: async e => { await put(`/api/documents/${id}`, { status: e.target.value }); toast('Stanje je spremenjeno'); } }) : null;
  const actions = h('div', { class: 'doc-actions' },
    saveBtn,
    act('Natisni / PDF', () => window.open(`/print/document/${id}`, '_blank')),
    act('Pošlji po e-pošti', async () => { const subject = `${T} ${d.number || ''} – ${F.company.name}`; const body = `Pozdravljeni,\n\nv priponki vam pošiljamo ${T.toLowerCase()} ${d.number || ''}.\n\nLep pozdrav,\n${F.me.full_name || ''}\n${F.company.name}`; window.open(`/print/document/${id}`, '_blank'); location.href = `mailto:${customer.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; toast('Dokument shranite kot PDF in ga pripnite sporočilu'); }),
    d.type === 'quote' ? act('Ustvari delovni nalog', async () => { const r = await post(`/api/documents/${id}/convert`, { to: 'workorder' }); go(`/dokument/${r.id}`); }) : null,
    d.type !== 'invoice' ? act('Ustvari račun', async () => { const r = await post(`/api/documents/${id}/convert`, { to: 'invoice' }); go(`/dokument/${r.id}`); }) : null,
    d.type === 'invoice' && d.status === 'draft' ? act('Izdaj račun', async () => {
      if (!lines.length) throw new Error('Račun nima postavk');
      if (!F.company.iban) toast('V nastavitvah vpišite IBAN, da bo račun vseboval UPN QR kodo', 'warn');
      if (!await confirmDialog('Ob izdaji račun dobi zaporedno številko in ga ni več mogoče spreminjati. Izdam račun?', { ok: 'Izdaj račun' })) return;
      const r = await post(`/api/documents/${id}/issue`); toast(`Račun ${r.number} je izdan`); reload();
    }, 'btn-primary') : null,
    d.type === 'invoice' && ['issued', 'partial'].includes(d.status) ? act('Vnesi plačilo', () => paymentDialog(d)) : null,
    d.type === 'workorder' && d.status !== 'done' ? act('Zaključi nalog', async () => {
      const svc = toggle(!!d.site_id, 'Označi redni servis objekta kot opravljen');
      let ok = false;
      await new Promise(res => modal('Zaključi delovni nalog', h('div', {}, h('p', {}, 'Porabljen material iz kataloga se odšteje od zaloge.'), d.site_id ? svc : null), { onClose: res, actions: [{ label: 'Prekliči' }, { label: 'Zaključi', kind: 'btn-primary', onClick: () => { ok = true; } }] }));
      if (!ok) return;
      await post(`/api/documents/${id}/close`, { serviced: svc.input.checked }); toast('Nalog je zaključen'); reload();
    }, 'btn-primary') : null,
    statusSel,
    act('Podvoji', async () => { const r = await post(`/api/documents/${id}/duplicate`); go(`/dokument/${r.id}`); }),
    d.type === 'invoice' && ['issued', 'partial'].includes(d.status) ? act('Storniraj', async () => { if (await confirmDialog('Storniram račun? Številka ostane zabeležena, račun pa ne šteje več v promet. Za knjigovodstvo izdajte tudi dobropis.', { danger: true, ok: 'Storniraj' })) { await put(`/api/documents/${id}`, { status: 'cancelled' }); reload(); } }, 'btn-danger') : null,
    !locked ? act('Izbriši', async () => { if (await confirmDialog(`Izbrišem ${T.toLowerCase()}?`, { danger: true, ok: 'Izbriši' })) { dirty = false; await del(`/api/documents/${id}`); go(`/dokumenti/${SLUG_OF[d.type]}`); } }, 'btn-danger') : null);

  // ---- dodatki za delovni nalog: fotografije, podpis ----
  let extra = null;
  if (d.type === 'workorder') {
    const fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async e => {
      for (const file of e.target.files) await post('/api/files', { document_id: id, name: file.name, data: await downscale(file) });
      toast('Fotografije so dodane'); if (dirty) await save(true); reload();
    } });
    extra = h('div', {},
      h('div', { class: 'section-title' }, h('h2', {}, 'Opis del')), work,
      h('div', { class: 'section-title' }, h('h2', {}, 'Fotografije'), h('span', { class: 'spacer' }), fileIn, h('button', { class: 'btn btn-sm', onclick: () => fileIn.click() }, icon('snap', 14), 'Dodaj')),
      d.files.length ? h('div', { class: 'photos' }, d.files.map(f => h('a', { href: `/api/files/${f.id}`, target: '_blank' }, h('img', { src: `/api/files/${f.id}`, alt: f.name, loading: 'lazy' }),
        h('button', { class: 'btn-icon', 'aria-label': 'Izbriši', onclick: async ev => { ev.preventDefault(); await del(`/api/files/${f.id}`); reload(); } }, icon('x', 14))))) : h('p', { class: 'muted' }, 'Ni fotografij.'),
      h('div', { class: 'section-title' }, h('h2', {}, 'Podpis stranke')),
      d.signature ? h('div', {}, h('img', { src: d.signature, alt: 'Podpis', style: { maxHeight: '100px', background: '#fff', borderRadius: '6px', padding: '4px' } }), h('p', { class: 'muted' }, `${d.signed_name || ''}, ${new Date(d.signed_at * 1000).toLocaleString('sl-SI')}`),
        h('button', { class: 'btn btn-sm', onclick: () => signatureDialog(id) }, 'Ponovno podpiši'))
        : h('button', { class: 'btn', onclick: () => signatureDialog(id) }, icon('edit', 16), 'Stranka podpiše na telefonu'));
  }

  const payments = d.type === 'invoice' && d.payments.length ? h('div', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Plačila')),
    h('div', { class: 'list' }, d.payments.map(p => h('div', { class: 'list-item' }, h('div', { class: 'main' }, h('strong', {}, money(p.amount)), h('small', {}, `${dateSl(p.date)} · ${p.method}${p.note ? ` · ${p.note}` : ''}`)),
      h('button', { class: 'btn-icon', 'aria-label': 'Izbriši plačilo', onclick: async () => { if (await confirmDialog('Izbrišem plačilo?', { danger: true, ok: 'Izbriši' })) { await del(`/api/payments/${p.id}`); reload(); } } }, icon('trash', 16)))))) : null;

  const statusBadge = h('span', { class: `badge ${['paid', 'accepted', 'done'].includes(d.status) ? 'ok' : ['cancelled', 'rejected'].includes(d.status) ? 'err' : 'info'}` }, F.meta.status[d.type][d.status]);
  clear(page,
    h('a', { class: 'back', href: `#/dokumenti/${SLUG_OF[d.type]}` }, `‹ ${d.type === 'quote' ? 'Ponudbe' : d.type === 'workorder' ? 'Delovni nalogi' : 'Računi'}`),
    head(`${d.type === 'invoice' && d.status === 'draft' ? 'Osnutek računa' : T} ${d.number || ''}`, null, statusBadge),
    locked ? h('p', { class: 'muted' }, 'Račun je izdan in zaklenjen. Spremenite lahko le opombe in plačila.') : null,
    d.related.filter(r => r.id !== d.id).length ? h('p', { class: 'muted' }, 'Povezano: ', d.related.filter(r => r.id !== d.id).map(r => h('a', { href: `#/dokument/${r.id}`, style: { marginRight: '10px' } }, `${F.meta.doc_types[r.type]} ${r.number || '(osnutek)'}`))) : null,
    h('div', { class: 'panel', style: { marginBottom: '14px' } }, headFields),
    h('div', { class: 'panel', style: { marginBottom: '14px' } }, h('h2', {}, d.type === 'workorder' ? 'Porabljen material in ure' : 'Postavke'), linesTable),
    extra,
    payments,
    h('div', { class: 'section-title' }, h('h2', {}, 'Opombe')), notes,
    h('div', { style: { marginTop: '18px' } }, actions));
}

// Vnos opisa s samodejnim iskanjem v katalogu
function productInput(line, onPick, disabled) {
  const inp = h('input', { value: line.description || '', disabled, placeholder: 'Opis ali iskanje v katalogu', 'aria-label': 'Opis', autocomplete: 'off' });
  const wrap = h('div', { class: 'ac' }, inp);
  let box = null, items = [], hl = -1;
  const close = () => { box?.remove(); box = null; hl = -1; };
  const pick = p => {
    Object.assign(line, { product_id: p.id, description: p.name, unit: p.unit, price: p.price, vat: p.vat });
    close(); onPick();
  };
  const search = debounce(async () => {
    const s = inp.value.trim();
    if (s.length < 2) return close();
    items = (await get(`/api/products?limit=8&q=${encodeURIComponent(s)}`)).slice(0, 8);
    close();
    if (!items.length) return;
    box = h('div', { class: 'ac-list', role: 'listbox' }, items.map((p, i) => h('button', { type: 'button', role: 'option', onmousedown: e => { e.preventDefault(); pick(p); } },
      h('span', {}, p.name, h('br'), h('small', {}, [p.sku, p.track_stock ? `zaloga ${p.stock} ${p.unit}` : null].filter(Boolean).join(' · '))), h('span', {}, money(p.price)))));
    wrap.append(box);
  }, 200);
  inp.addEventListener('input', () => { line.description = inp.value; line.product_id = null; search(); });
  inp.addEventListener('blur', () => setTimeout(close, 150));
  inp.addEventListener('keydown', e => {
    if (!box) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; [...box.children].forEach((b, i) => b.classList.toggle('hl', i === hl)); }
    if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); pick(items[hl]); }
    if (e.key === 'Escape') close();
  });
  return wrap;
}

function paymentDialog(d) {
  const open = r2(d.total - d.paid);
  const amount = h('input', { type: 'number', step: '0.01', value: open, inputmode: 'decimal' });
  const date = h('input', { type: 'date', value: todayIso() });
  const method = select([['TRR', 'Nakazilo na TRR'], ['gotovina', 'Gotovina'], ['kartica', 'Kartica'], ['drugo', 'Drugo']], 'TRR');
  const note = h('input', {});
  return new Promise(res => modal('Vnos plačila', h('div', {}, h('p', {}, `Odprto: ${money(open)}`), h('div', { class: 'form-grid' }, field('Znesek', amount), field('Datum', date), field('Način', method), field('Opomba', note)),
    h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Opozorilo: za gotovinske račune je v Sloveniji obvezno davčno potrjevanje računov (FURS). VisionOne Field ga ne izvaja – za gotovino uporabite davčno blagajno.')), {
    onClose: res,
    actions: [{ label: 'Prekliči' }, { label: 'Shrani plačilo', kind: 'btn-primary', onClick: async () => { await post(`/api/documents/${d.id}/payments`, { amount: Number(amount.value), date: date.value, method: method.value, note: note.value }); toast('Plačilo je zabeleženo'); reload(); } }],
  }));
}

function signatureDialog(id) {
  const canvas = h('canvas', { class: 'sigpad' });
  const name = h('input', { placeholder: 'Ime in priimek podpisnika' });
  let drawing = false, has = false, ctx;
  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', e => { drawing = true; has = true; canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
  canvas.addEventListener('pointermove', e => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  modal('Podpis stranke', h('div', {}, h('p', { class: 'muted' }, 'Stranka se podpiše s prstom v okvir.'), canvas, h('div', { style: { height: '10px' } }), field('Podpisnik', name),
    h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); has = false; } }, 'Počisti')), {
    actions: [{ label: 'Prekliči' }, { label: 'Shrani podpis', kind: 'btn-primary', onClick: async () => {
      if (!has) throw new Error('Podpis je prazen');
      await post(`/api/documents/${id}/sign`, { signature: canvas.toDataURL('image/png'), name: name.value }); toast('Podpis je shranjen'); reload();
    } }],
  });
  requestAnimationFrame(() => {
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
    ctx = canvas.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  });
}
