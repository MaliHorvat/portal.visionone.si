// VisionOne Field – koledar, katalog in nastavitve
import { h, clear, icon, get, post, put, del, toast, toastErr, modal, confirmDialog, field, select, toggle, formData, emptyState, debounce } from './lib/core.js';
import { F, money, dateSl, timeSl, todayIso, head, go, reload, mapsUrl } from './app.js';

// ======================= KOLEDAR =======================
let weekOffset = 0;
export async function pageCalendar(page) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
  const from = Math.floor(start / 1000), to = from + 7 * 86400;
  const items = await get(`/api/appointments?from=${from}&to=${to}`);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const label = `${days[0].toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' })} – ${days[6].toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
  const TYPES = { service: 'Servis', install: 'Montaža', survey: 'Ogled', repair: 'Popravilo', meeting: 'Sestanek', other: 'Drugo' };
  clear(page,
    head('Koledar', label,
      h('button', { class: 'btn', 'aria-label': 'Prejšnji teden', onclick: () => { weekOffset--; reload(); } }, '‹'),
      h('button', { class: 'btn', onclick: () => { weekOffset = 0; reload(); } }, 'Ta teden'),
      h('button', { class: 'btn', 'aria-label': 'Naslednji teden', onclick: () => { weekOffset++; reload(); } }, '›'),
      h('button', { class: 'btn btn-primary', onclick: () => appointmentDialog() }, icon('plus', 16), 'Termin')),
    days.map(d => {
      const dayItems = items.filter(a => a.start >= d / 1000 && a.start < d / 1000 + 86400);
      const isToday = d.toDateString() === new Date().toDateString();
      return h('div', { class: `cal-day ${isToday ? 'today' : ''}` },
        h('h3', {}, d.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }), isToday ? ' · danes' : ''),
        dayItems.length ? h('div', { class: 'list' }, dayItems.map(a => h('div', { class: `appt ${a.done ? 'done' : ''}` },
          h('div', { class: 'time' }, timeSl(a.start), a.end ? h('small', {}, `do ${timeSl(a.end)}`) : null),
          h('div', { style: { minWidth: 0, cursor: 'pointer' }, onclick: () => appointmentDialog(a) },
            h('strong', {}, a.title || TYPES[a.type] || 'Termin'), ' ', h('span', { class: 'tag' }, TYPES[a.type] || a.type),
            h('div', { class: 'muted', style: { fontSize: '13.5px' } }, [a.customer_name, a.site_name, a.technician].filter(Boolean).join(' · ')),
            a.notes ? h('div', { class: 'muted', style: { fontSize: '13px', whiteSpace: 'pre-wrap' } }, a.notes) : null),
          h('div', { class: 'acts' },
            a.customer_phone ? h('a', { class: 'btn-icon', href: `tel:${a.customer_phone.replace(/\s/g, '')}`, title: 'Pokliči' }, '☎') : null,
            a.site_address ? h('a', { class: 'btn-icon', href: mapsUrl(a.site_address, a.site_city), target: '_blank', rel: 'noopener', title: 'Navigacija' }, icon('map')) : null,
            h('a', { class: 'btn-icon', href: `/api/appointments/${a.id}/ics`, title: 'Dodaj v koledar telefona' }, icon('download')),
            !a.done ? h('button', { class: 'btn-icon', title: 'Opravljeno', onclick: async () => { await put(`/api/appointments/${a.id}`, { done: 1 }); reload(); } }, icon('check')) : null))))
          : h('p', { class: 'muted', style: { margin: '0 0 4px', fontSize: '13.5px' } }, 'Ni terminov.'));
    }));
}

export async function appointmentDialog(a = {}) {
  const customers = await get('/api/customers');
  const custSel = select([['', '– brez stranke –'], ...customers.map(c => [c.id, c.name])], a.customer_id || '');
  const siteSel = select([['', '–']], '');
  const loadSites = async () => {
    clear(siteSel, h('option', { value: '' }, '–'));
    if (!custSel.value) return;
    const c = await get(`/api/customers/${custSel.value}`);
    for (const s of c.sites) siteSel.append(h('option', { value: s.id, selected: s.id === a.site_id || c.sites.length === 1 }, s.name));
  };
  custSel.onchange = loadSites;
  await loadSites();
  const startD = a.start ? new Date(a.start * 1000) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; })();
  const local = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const start = h('input', { type: 'datetime-local', value: local(startD) });
  const dur = select([[30, '30 min'], [60, '1 ura'], [90, '1,5 ure'], [120, '2 uri'], [180, '3 ure'], [240, '4 ure'], [480, 'cel dan']], a.end ? Math.round((a.end - a.start) / 60) : 120);
  const type = select([['service', 'Servis'], ['install', 'Montaža'], ['survey', 'Ogled'], ['repair', 'Popravilo'], ['meeting', 'Sestanek'], ['other', 'Drugo']], a.type || 'service');
  const title = h('input', { value: a.title || '', placeholder: 'npr. Redni servis kamer' });
  const tech = h('input', { value: a.technician || F.me.full_name || '' });
  const notes = h('textarea', {}, a.notes || '');
  modal(a.id ? 'Termin' : 'Nov termin', h('div', { class: 'form-grid' }, field('Stranka', custSel), field('Objekt', siteSel), field('Začetek', start), field('Trajanje', dur), field('Vrsta', type), field('Naslov', title), field('Izvajalec', tech), h('div', { class: 'span-2' }, field('Opombe', notes))), {
    wide: true,
    actions: [
      a.id ? { label: 'Izbriši', kind: 'btn-danger', onClick: async () => { if (await confirmDialog('Izbrišem termin?', { danger: true, ok: 'Izbriši' })) { await del(`/api/appointments/${a.id}`); reload(); } } } : null,
      { label: 'Prekliči' },
      { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
        const s = Math.floor(new Date(start.value).getTime() / 1000);
        const body = { customer_id: custSel.value ? Number(custSel.value) : null, site_id: siteSel.value ? Number(siteSel.value) : null, start: s, end: s + Number(dur.value) * 60, type: type.value, title: title.value, technician: tech.value, notes: notes.value };
        if (a.id) await put(`/api/appointments/${a.id}`, body); else await post('/api/appointments', body);
        toast('Termin je shranjen'); reload();
      } }].filter(Boolean),
  });
}

// ======================= KATALOG =======================
export async function pageCatalog(page) {
  const search = h('input', { type: 'search', placeholder: 'Išči po nazivu, šifri, proizvajalcu, lastnostih', style: { maxWidth: '360px' } });
  const catSel = h('select', { style: { maxWidth: '320px' }, 'aria-label': 'Kategorija' }, h('option', { value: '' }, 'Vse kategorije'));
  const info = h('div', { class: 'muted', style: { fontSize: '12.5px', margin: '6px 0 0' } });
  const tbody = h('tbody');
  const loadCats = async () => {
    const cats = await get('/api/products/categories').catch(() => []);
    const cur = catSel.value;
    clear(catSel, h('option', { value: '' }, 'Vse kategorije'), cats.map(c => h('option', { value: c.category, selected: c.category === cur }, `${c.category} (${c.n})`)));
  };
  const load = async () => {
    const rows = await get(`/api/products?all=1&limit=1500&q=${encodeURIComponent(search.value)}&category=${encodeURIComponent(catSel.value)}`);
    info.textContent = rows.length >= 1500 ? 'Prikazanih je prvih 1500 izdelkov – zožite iskanje ali izberite kategorijo.' : `${rows.length} izdelkov`;
    clear(tbody, rows.map(p => h('tr', { style: { opacity: p.active ? 1 : 0.5 } },
      h('td', { class: 'mono hide-m' }, p.sku || ''),
      h('td', {}, h('strong', {}, p.name), h('div', { class: 'muted', style: { fontSize: '12.5px' } },
        [p.category, p.brand].filter(Boolean).join(' · '),
        p.supplier === 'digitklik' ? h('span', {}, ' · ', h('a', { href: p.supplier_url, target: '_blank', rel: 'noopener' }, 'digitklik.si'), p.supplier_stock ? ` (zaloga ${p.supplier_stock})` : '') : null)),
      h('td', { class: 'num hide-m' }, money(p.purchase_price)),
      h('td', { class: 'num' }, money(p.price), h('div', { class: 'muted', style: { fontSize: '12px' } }, `/${p.unit}`)),
      h('td', { class: 'num hide-m' }, p.purchase_price > 0 && p.price > 0 ? `${Math.round(((p.price - p.purchase_price) / p.price) * 100)} %` : '–'),
      h('td', { class: 'num' }, p.track_stock ? h('span', { style: { color: p.min_stock > 0 && p.stock <= p.min_stock ? 'var(--warn)' : '' } }, `${p.stock}`) : '–'),
      h('td', { class: 'actions' }, h('button', { class: 'btn btn-sm', onclick: () => productDialog(p) }, 'Uredi')))));
  };
  search.oninput = debounce(load, 250);
  catSel.onchange = load;
  const isAdmin = F.me.role === 'admin';
  clear(page,
    head('Katalog izdelkov in storitev', 'Cene in zaloga. Postavke se samodejno ponudijo pri vnosu ponudb, nalogov in računov.',
      isAdmin ? h('button', { class: 'btn hide-m', onclick: () => digitklikDialog(async () => { await loadCats(); await load(); }) }, icon('download', 16), 'Uvoz iz digitklik.si') : null,
      h('button', { class: 'btn hide-m', onclick: importDialog }, 'Uvoz iz CSV'),
      h('button', { class: 'btn btn-primary', onclick: () => productDialog() }, icon('plus', 16), 'Nov izdelek')),
    h('div', { class: 'row', style: { marginBottom: '12px', gap: '8px', flexWrap: 'wrap' } }, search, catSel),
    info,
    h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'hide-m' }, 'Šifra'), h('th', {}, 'Naziv'), h('th', { class: 'num hide-m' }, 'Nabavna'), h('th', { class: 'num' }, 'Prodajna'), h('th', { class: 'num hide-m' }, 'Marža'), h('th', { class: 'num' }, 'Zaloga'), h('th', {}))), tbody)));
  loadCats();
  load();
}

// Uvoz celotnega cenika z digitklik.si: kategorije po skupinah, z napredkom
async function digitklikDialog(onDone) {
  const st = await get('/api/import/digitklik').catch(() => ({}));
  const marginIn = h('input', { type: 'number', min: 0, max: 500, step: 1, value: localStorage.getItem('v1f-dk-margin') ?? 25, style: { maxWidth: '120px' } });
  const upd = toggle(true, 'Posodobi prodajne cene že uvoženih izdelkov');
  const arch = toggle(true, 'Izdelke, ki jih na digitklik.si ni več, označi kot neaktivne');
  const bar = h('div', { style: { height: '8px', background: 'var(--panel-3, #e5e7eb)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 6px' } }, h('div', { style: { height: '100%', width: '0%', background: 'var(--accent)', transition: 'width .2s' } }));
  const status = h('div', { class: 'muted', style: { fontSize: '13px', minHeight: '1.4em' } },
    st.last ? `Zadnji uvoz: ${new Date(st.last.at).toLocaleString('sl-SI')} · ${st.count} aktivnih izdelkov` : 'Uvoz še ni bil izveden.');
  const errBox = h('div', { class: 'muted', style: { fontSize: '12px', maxHeight: '120px', overflow: 'auto', whiteSpace: 'pre-wrap' } });
  let running = false, cancel = false;
  const body = h('div', {},
    h('p', { class: 'muted' }, 'Prenese celoten javni cenik digitklik.si (kamere, snemalnike, domofone, alarme, omrežno opremo, material …). Cene na digitklik.si so z DDV – kot nabavna cena se vpiše cena brez DDV, prodajna pa z vašo maržo. Uvoz traja nekaj minut; okno pustite odprto.'),
    field('Marža na nabavno ceno (%)', marginIn, 'Prodajna cena = nabavna × (1 + marža). Ceno posameznega izdelka lahko kasneje ročno popravite.'),
    h('div', { style: { margin: '8px 0' } }, upd), h('div', { style: { margin: '8px 0' } }, arch), bar, status, errBox);
  const setPct = p => { bar.firstChild.style.width = `${p}%`; };
  modal('Uvoz iz digitklik.si', body, {
    wide: true,
    onClose: () => { cancel = true; },
    actions: [
      { label: 'Zapri', onClick: () => { cancel = true; } },
      { label: 'Začni uvoz', kind: 'btn-primary', close: false, onClick: async () => {
        if (running) return false;
        running = true; cancel = false;
        const margin = Number(marginIn.value) || 0;
        localStorage.setItem('v1f-dk-margin', margin);
        status.textContent = 'Berem seznam kategorij …'; errBox.textContent = ''; setPct(1);
        try {
          const { categories, started } = await post('/api/import/digitklik/start');
          const queue = [...categories];
          const tot = { categories: 0, products: 0, inserted: 0, updated: 0, errors: [] };
          while (queue.length && !cancel) {
            const slugs = queue.slice(0, 8);
            const r = await post('/api/import/digitklik/batch', { slugs, margin, update_prices: upd.input.checked, started });
            for (const s of r.done || slugs) { const i = queue.indexOf(s); if (i >= 0) queue.splice(i, 1); }
            if (!(r.done || []).length) queue.splice(0, slugs.length);
            tot.categories += r.categories; tot.products += r.products; tot.inserted += r.inserted; tot.updated += r.updated; tot.errors.push(...r.errors);
            setPct(Math.round(((categories.length - queue.length) / categories.length) * 100));
            status.textContent = `Kategorij ${categories.length - queue.length} / ${categories.length} · novih ${tot.inserted} · posodobljenih ${tot.updated}`;
            if (r.errors.length) errBox.textContent = tot.errors.slice(-20).join('\n');
          }
          if (cancel) { status.textContent += ' · prekinjeno'; return false; }
          const fin = await post('/api/import/digitklik/finish', { started, margin, archive_missing: arch.input.checked && tot.errors.length === 0, stats: tot });
          setPct(100);
          status.textContent = `Končano: ${fin.count} aktivnih izdelkov z digitklik.si (novih ${tot.inserted}, posodobljenih ${tot.updated}${fin.archived ? `, neaktivnih ${fin.archived}` : ''}).`;
          if (tot.errors.length) status.textContent += ` Napak: ${tot.errors.length} – izdelkov, ki jih ni več, zato nisem označil kot neaktivne.`;
          toast('Uvoz iz digitklik.si je končan');
          await onDone?.();
        } finally { running = false; }
        return false;
      } },
    ],
  });
}

function productDialog(p = {}) {
  const f = h('form', {},
    h('div', { class: 'form-grid' },
      field('Naziv', h('input', { name: 'name', value: p.name || '' })), field('Šifra', h('input', { name: 'sku', value: p.sku || '' })),
      field('Kategorija', h('input', { name: 'category', value: p.category || '', list: 'cats' })), field('Proizvajalec', h('input', { name: 'brand', value: p.brand || '' })),
      field('Enota', h('input', { name: 'unit', value: p.unit || 'kos', list: 'units2' })), field('Nabavna cena (€)', h('input', { name: 'purchase_price', type: 'number', step: '0.01', value: p.purchase_price ?? 0 })),
      field('Prodajna cena brez DDV (€)', h('input', { name: 'price', type: 'number', step: '0.01', value: p.price ?? 0 })), field('DDV (%)', select([[22, '22 %'], [9.5, '9,5 %'], [5, '5 %'], [0, '0 %']], p.vat ?? 22, { name: 'vat' })),
      field('Zaloga', h('input', { name: 'stock', type: 'number', step: 'any', value: p.stock ?? 0 })), field('Opozori pri zalogi pod', h('input', { name: 'min_stock', type: 'number', step: 'any', value: p.min_stock ?? 0 })),
      field('Vrsta opreme (za vpis na objekt)', select([['', '–'], ...Object.entries(F.meta.equipment_types)], p.equipment_type || '', { name: 'equipment_type' }))),
    h('datalist', { id: 'cats' }, ['Kamere', 'Snemalniki', 'Diski', 'Omrežje', 'Material', 'Napajanje', 'Storitve', 'Domofonija', 'Alarm'].map(c => h('option', { value: c }))),
    h('datalist', { id: 'units2' }, ['kos', 'ura', 'm', 'km', 'kpl', 'pavšal'].map(c => h('option', { value: c }))),
    (() => { const t = toggle(p.track_stock ?? 1, 'Vodi zalogo'); t.input.name = 'track_stock'; return t; })(),
    (() => { const t = toggle(p.active ?? 1, 'Aktiven (prikazan pri vnosu)'); t.input.name = 'active'; return t; })(),
    field('Opis', h('textarea', { name: 'description' }, p.description || '')));
  modal(p.id ? 'Uredi izdelek' : 'Nov izdelek', f, {
    wide: true,
    actions: [
      p.id && F.me.role === 'admin' ? { label: 'Izbriši', kind: 'btn-danger', onClick: async () => { if (await confirmDialog('Izbrišem izdelek? Če je uporabljen v dokumentih, bo le arhiviran.', { danger: true, ok: 'Izbriši' })) { await del(`/api/products/${p.id}`); reload(); } } } : null,
      { label: 'Prekliči' },
      { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
        const d = formData(f); d.vat = Number(d.vat); d.equipment_type = d.equipment_type || null;
        if (!d.name) throw new Error('Vpišite naziv');
        if (p.id) await put(`/api/products/${p.id}`, d); else await post('/api/products', d);
        toast('Izdelek je shranjen'); reload();
      } }].filter(Boolean),
  });
}

function importDialog() {
  const ta = h('textarea', { rows: 10, placeholder: 'šifra;naziv;kategorija;enota;nabavna;prodajna;ddv\nCAM-01;IP kamera 4MP;Kamere;kos;70;129;22' });
  modal('Uvoz izdelkov iz CSV', h('div', {}, h('p', { class: 'muted' }, 'Prilepite vrstice iz Excela ali cenika dobavitelja. Stolpci: šifra; naziv; kategorija; enota; nabavna cena; prodajna cena; DDV. Ločilo je podpičje ali tabulator.'), ta), {
    wide: true,
    actions: [{ label: 'Prekliči' }, { label: 'Uvozi', kind: 'btn-primary', onClick: async () => {
      const n = v => Number(String(v || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      const items = ta.value.split(/\r?\n/).map(l => l.split(/;|\t/)).filter(c => c.length >= 2 && c[1] && !/^naziv$/i.test(c[1].trim()))
        .map(c => ({ sku: c[0]?.trim(), name: c[1].trim(), category: c[2]?.trim(), unit: c[3]?.trim() || 'kos', purchase_price: n(c[4]), price: n(c[5]), vat: c[6] ? n(c[6]) : 22 }));
      if (!items.length) throw new Error('Ni veljavnih vrstic');
      await post('/api/products', { items }); toast(`Uvoženih ${items.length} izdelkov`); reload();
    } }],
  });
}

// ======================= NASTAVITVE =======================
export async function pageSettings(page) {
  const c = await get('/api/company');
  const isAdmin = F.me.role === 'admin';
  const inp = (name, attrs = {}) => h('input', { name, value: c[name] ?? '', disabled: !isAdmin, ...attrs });
  const logoImg = h('img', { src: c.logo || '', alt: '', style: { maxHeight: '60px', display: c.logo ? 'block' : 'none', marginBottom: '8px' } });
  let logo = c.logo;
  const logoIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml', disabled: !isAdmin, onchange: e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 1e6) return toast('Logotip naj bo manjši od 1 MB', 'warn');
    const fr = new FileReader(); fr.onload = () => { logo = fr.result; logoImg.src = logo; logoImg.style.display = 'block'; }; fr.readAsDataURL(f);
  } });
  const vat = toggle(c.vat_payer, 'Podjetje je zavezanec za DDV'); vat.input.name = 'vat_payer'; vat.input.disabled = !isAdmin;
  const f = h('form', {},
    h('fieldset', {}, h('legend', {}, 'Podjetje'), h('div', { class: 'form-grid' },
      field('Naziv', inp('name')), field('Naslov', inp('address')), field('Poštna številka', inp('post')), field('Kraj', inp('city')),
      field('Davčna številka', inp('tax_id')), field('Matična številka', inp('reg_no')), field('Telefon', inp('phone')), field('E-pošta', inp('email')), field('Spletna stran', inp('web'))), vat,
      field('Logotip', logoIn), logoImg),
    h('fieldset', {}, h('legend', {}, 'Plačila (za UPN QR na računu)'), h('div', { class: 'form-grid' },
      field('IBAN', inp('iban', { placeholder: 'SI56 …' })), field('BIC', inp('bic')), field('Banka', inp('bank')),
      field('Koda namena', inp('purpose_code'), 'GDSV = plačilo blaga in storitev'), field('Privzeti rok plačila (dni)', inp('payment_days', { type: 'number' })))),
    h('fieldset', {}, h('legend', {}, 'Dokumenti'), h('div', { class: 'form-grid' },
      field('Oblika številke računa', inp('invoice_format'), '{YYYY} leto, {NNNN} zaporedna številka'), field('Oblika številke ponudbe', inp('quote_format')), field('Oblika številke naloga', inp('workorder_format')),
      field('Veljavnost ponudbe (dni)', inp('quote_valid_days', { type: 'number' })), field('Privzeti DDV (%)', inp('default_vat', { type: 'number', step: '0.5' })), field('Urna postavka (€)', inp('hourly_rate', { type: 'number', step: '0.5' }))),
      field('Privzeta opomba na ponudbi', h('textarea', { name: 'quote_note', disabled: !isAdmin }, c.quote_note || '')),
      field('Privzeta opomba na računu', h('textarea', { name: 'invoice_note', disabled: !isAdmin }, c.invoice_note || '')),
      field('Noga dokumentov', h('textarea', { name: 'footer', disabled: !isAdmin, placeholder: 'npr. Družba je vpisana v sodni register …, osnovni kapital …' }, c.footer || ''))),
    isAdmin ? h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
      const d = formData(f); d.logo = logo || null;
      for (const k of ['payment_days', 'quote_valid_days', 'default_vat', 'hourly_rate']) d[k] = Number(d[k]) || 0;
      await put('/api/company', d); F.company = await get('/api/company'); toast('Nastavitve so shranjene');
    } }, 'Shrani nastavitve') : h('p', { class: 'muted' }, 'Nastavitve podjetja ureja skrbnik.'));
  const oldPw = h('input', { type: 'password', autocomplete: 'current-password' }), newPw = h('input', { type: 'password', autocomplete: 'new-password' });
  const usersBox = h('div');
  const loadUsers = async () => {
    if (!isAdmin) return;
    const users = await get('/api/users');
    clear(usersBox, h('div', { class: 'list', style: { marginBottom: '10px' } }, users.map(u => h('div', { class: 'list-item' }, h('div', { class: 'main' }, h('strong', {}, u.full_name || u.username), h('small', {}, `${u.username} · ${u.role === 'admin' ? 'skrbnik' : 'serviser'}${u.enabled ? '' : ' · onemogočen'}`)),
      h('button', { class: 'btn btn-sm', onclick: () => userDialog(u, loadUsers) }, 'Uredi')))),
      h('button', { class: 'btn btn-sm', onclick: () => userDialog(null, loadUsers) }, icon('plus', 14), 'Nov uporabnik'));
  };
  clear(page, head('Nastavitve'), h('div', { class: 'stack' }, h('div', { class: 'panel' }, f),
    h('div', { class: 'grid-2' },
      h('div', { class: 'panel' }, h('h2', {}, 'Moje geslo'), field('Trenutno geslo', oldPw), field('Novo geslo', newPw),
        h('button', { class: 'btn', onclick: async () => { try { await post('/api/auth/password', { old_password: oldPw.value, new_password: newPw.value }); toast('Geslo je spremenjeno'); oldPw.value = newPw.value = ''; } catch (e) { toastErr(e); } } }, 'Spremeni geslo')),
      isAdmin ? h('div', { class: 'panel' }, h('h2', {}, 'Uporabniki'), usersBox) : null,
      h('div', { class: 'panel' }, h('h2', {}, 'Izvoz in varnostna kopija'),
        h('p', { class: 'muted' }, 'Knjigo računov v CSV pošljite računovodji. Varnostna kopija vsebuje celotno bazo (brez fotografij).'),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: `/api/export/invoices.csv?year=${new Date().getFullYear()}` }, 'Računi letos (CSV)'), h('a', { class: 'btn', href: '/api/export/customers.csv' }, 'Stranke (CSV)'),
          isAdmin ? h('a', { class: 'btn', href: '/api/backup' }, 'Prenesi varnostno kopijo') : null)))));
  loadUsers();
}

function userDialog(u, done) {
  const f = h('form', { autocomplete: 'off' }, h('div', { class: 'form-grid' },
    field('Uporabniško ime', h('input', { name: 'username', value: u?.username || '', disabled: !!u })), field('Ime in priimek', h('input', { name: 'full_name', value: u?.full_name || '' })),
    field('E-pošta', h('input', { name: 'email', value: u?.email || '' })), field('Telefon', h('input', { name: 'phone', value: u?.phone || '' })),
    field('Vloga', select([['tech', 'Serviser'], ['admin', 'Skrbnik']], u?.role || 'tech', { name: 'role' })),
    field(u ? 'Novo geslo (prazno = nespremenjeno)' : 'Geslo (vsaj 8 znakov)', h('input', { name: 'password', type: 'password', autocomplete: 'new-password' }))),
    (() => { const t = toggle(u ? u.enabled : 1, 'Račun je omogočen'); t.input.name = 'enabled'; return t; })());
  modal(u ? 'Uredi uporabnika' : 'Nov uporabnik', f, {
    actions: [
      u && u.id !== F.me.id ? { label: 'Izbriši', kind: 'btn-danger', onClick: async () => { if (await confirmDialog('Izbrišem uporabnika?', { danger: true, ok: 'Izbriši' })) { await del(`/api/users/${u.id}`); done(); } } } : null,
      { label: 'Prekliči' },
      { label: 'Shrani', kind: 'btn-primary', onClick: async () => { const d = formData(f); if (!d.password) delete d.password; if (u) await put(`/api/users/${u.id}`, d); else await post('/api/users', d); toast('Uporabnik je shranjen'); done(); } }].filter(Boolean),
  });
}
