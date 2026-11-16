// VisionOne Field – koledar, katalog in nastavitve
import { installPanel } from './pwa.js';
import { h, clear, icon, get, post, put, del, toast, toastErr, modal, confirmDialog, field, select, toggle, formData, emptyState, debounce } from './lib/core.js';
import { F, money, dateSl, timeSl, todayIso, head, go, reload, mapsUrl, productThumb } from './app.js';

// ======================= KOLEDAR =======================
// Pravi koledar: mesec (mreža), teden ali dan (časovnica po urah) in seznam prihodnjih terminov.
const TYPES = { service: 'Servis', install: 'Montaža', survey: 'Ogled', repair: 'Popravilo', meeting: 'Sestanek', other: 'Drugo' };
const DOW = ['pon', 'tor', 'sre', 'čet', 'pet', 'sob', 'ned'];
const DAY_S = 86400;
const cal = { view: null, cursor: null, selected: null };
const isPhone = () => window.matchMedia('(max-width: 700px)').matches;
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => addDays(dayStart(d), -((new Date(d).getDay() + 6) % 7));
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const ts = d => Math.floor(d.getTime() / 1000);
const fmt = (d, o) => d.toLocaleDateString('sl-SI', o);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const hm = s => timeSl(s);
const apptTitle = a => a.title || TYPES[a.type] || 'Termin';
const newAt = (d, hour = 8, min = 0) => { const x = dayStart(d); x.setHours(hour, min, 0, 0); appointmentDialog({ start: ts(x) }); };

export async function pageCalendar(page) {
  if (!cal.view) { try { cal.view = localStorage.getItem('v1-cal-view') || 'mesec'; } catch { cal.view = 'mesec'; } }
  if (!cal.cursor) cal.cursor = dayStart(new Date());
  if (!cal.selected) cal.selected = dayStart(new Date());
  let view = cal.view;
  if (view === 'teden' && isPhone()) view = 'dan';
  if (view === 'dan' && !isPhone()) view = 'teden';

  // obdobje za prikaz
  let from, to, title;
  const c = cal.cursor;
  if (view === 'mesec') {
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    from = mondayOf(first);
    const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
    to = addDays(mondayOf(last), 7);
    title = cap(fmt(first, { month: 'long', year: 'numeric' }));
  } else if (view === 'teden') {
    from = mondayOf(c); to = addDays(from, 7);
    title = `${fmt(from, { day: 'numeric', month: 'numeric' })} – ${fmt(addDays(to, -1), { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
  } else if (view === 'dan') {
    from = dayStart(c); to = addDays(from, 1);
    title = cap(fmt(from, { weekday: 'long', day: 'numeric', month: 'long' }));
  } else {
    from = dayStart(new Date()); to = addDays(from, 90);
    title = 'Prihodnji termini';
  }
  const items = await get(`/api/appointments?from=${ts(from)}&to=${ts(to)}`);
  const onDay = d => items.filter(a => a.start >= ts(d) && a.start < ts(d) + DAY_S).sort((a, b) => a.start - b.start);

  const step = dir => {
    if (view === 'mesec') cal.cursor = new Date(c.getFullYear(), c.getMonth() + dir, 1);
    else if (view === 'teden') cal.cursor = addDays(c, 7 * dir);
    else if (view === 'dan') { cal.cursor = addDays(c, dir); cal.selected = cal.cursor; }
    reload();
  };
  const setView = v => { cal.view = v; try { localStorage.setItem('v1-cal-view', v); } catch { /* */ } if (v === 'dan' || v === 'teden') cal.cursor = cal.selected || cal.cursor; reload(); };
  const views = [['mesec', 'Mesec'], [isPhone() ? 'dan' : 'teden', isPhone() ? 'Dan' : 'Teden'], ['seznam', 'Seznam']];

  const toolbar = h('div', { class: 'cal-bar' },
    h('div', { class: 'cal-nav' },
      view !== 'seznam' ? [
        h('button', { class: 'btn', 'aria-label': 'Nazaj', onclick: () => step(-1) }, '‹'),
        h('button', { class: 'btn', onclick: () => { cal.cursor = dayStart(new Date()); cal.selected = cal.cursor; reload(); } }, 'Danes'),
        h('button', { class: 'btn', 'aria-label': 'Naprej', onclick: () => step(1) }, '›'),
      ] : null,
      h('h2', { class: 'cal-title' }, title)),
    h('div', { class: 'cal-seg', role: 'tablist', 'aria-label': 'Pogled koledarja' },
      views.map(([v, l]) => h('button', { role: 'tab', 'aria-selected': String(view === v), onclick: () => setView(v) }, l))),
    h('button', { class: 'btn btn-primary', onclick: () => newAt(cal.selected || new Date()) }, icon('plus', 16), 'Termin'));

  let body;
  if (view === 'mesec') body = monthView(from, to, c, onDay);
  else if (view === 'teden') body = timeGrid(Array.from({ length: 7 }, (_, i) => addDays(from, i)), items);
  else if (view === 'dan') body = timeGrid([from], items);
  else body = agenda(items);

  clear(page, h('div', { class: 'f-head' }, h('h1', {}, 'Koledar')), toolbar, body);
}

function chip(a, compact) {
  return h('button', { class: `cal-chip t-${a.type || 'other'}${a.done ? ' done' : ''}`, title: `${hm(a.start)} ${apptTitle(a)}${a.customer_name ? ' · ' + a.customer_name : ''}`,
    onclick: e => { e.stopPropagation(); appointmentDialog(a); } },
    h('span', { class: 'cal-chip-time' }, hm(a.start)), compact ? null : h('span', { class: 'cal-chip-txt' }, apptTitle(a)));
}

function monthView(from, to, cursor, onDay) {
  const today = dayStart(new Date());
  const cells = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) {
    const day = new Date(d);
    const list = onDay(day);
    const out = day.getMonth() !== cursor.getMonth();
    const sel = cal.selected && sameDay(day, cal.selected);
    const max = 3;
    cells.push(h('div', {
      class: `cal-cell${out ? ' out' : ''}${sameDay(day, today) ? ' today' : ''}${sel ? ' sel' : ''}${day < today ? ' past' : ''}`,
      role: 'gridcell', tabindex: 0, 'aria-label': fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }) + (list.length ? `, ${list.length} termin(ov)` : ''),
      onclick: () => { cal.selected = day; reload(); },
      ondblclick: () => newAt(day),
      onkeydown: e => { if (e.key === 'Enter') { cal.selected = day; reload(); } },
    },
      h('div', { class: 'cal-cell-head' }, h('span', { class: 'cal-num' }, String(day.getDate())),
        h('button', { class: 'cal-add', 'aria-label': 'Nov termin', title: 'Nov termin', onclick: e => { e.stopPropagation(); newAt(day); } }, '+')),
      h('div', { class: 'cal-chips' }, list.slice(0, max).map(a => chip(a, false)),
        list.length > max ? h('span', { class: 'cal-more' }, `+ še ${list.length - max}`) : null),
      list.length ? h('div', { class: 'cal-dots', 'aria-hidden': 'true' }, list.slice(0, 4).map(a => h('i', { class: `t-${a.type || 'other'}` }))) : null));
  }
  const sel = cal.selected && cal.selected >= from && cal.selected < to ? cal.selected : null;
  return h('div', { class: 'cal-month-wrap' },
    h('div', { class: 'cal-month', role: 'grid' },
      DOW.map(d => h('div', { class: 'cal-dow', role: 'columnheader' }, d)),
      cells),
    sel ? dayPanel(sel, onDay(sel)) : null);
}

function dayPanel(day, list) {
  return h('section', { class: 'cal-daypanel' },
    h('div', { class: 'section-title' }, h('h2', {}, cap(fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }))), h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-sm', onclick: () => newAt(day) }, icon('plus', 14), 'Termin')),
    list.length ? h('div', { class: 'list' }, list.map(apptRow)) : h('p', { class: 'muted' }, 'Ta dan ni terminov.'));
}

function apptRow(a) {
  return h('div', { class: `appt ${a.done ? 'done' : ''}` },
    h('div', { class: 'time' }, hm(a.start), a.end ? h('small', {}, `do ${hm(a.end)}`) : null),
    h('div', { style: { minWidth: 0, cursor: 'pointer' }, onclick: () => appointmentDialog(a) },
      h('strong', {}, apptTitle(a)), ' ', h('span', { class: `tag t-${a.type || 'other'}` }, TYPES[a.type] || a.type),
      h('div', { class: 'muted', style: { fontSize: '13.5px' } }, [a.customer_name, a.site_name, a.technician].filter(Boolean).join(' · ')),
      a.notes ? h('div', { class: 'muted', style: { fontSize: '13px', whiteSpace: 'pre-wrap' } }, a.notes) : null),
    h('div', { class: 'acts' },
      a.customer_phone ? h('a', { class: 'btn-icon', href: `tel:${a.customer_phone.replace(/\s/g, '')}`, title: 'Pokliči' }, '☎') : null,
      a.site_address ? h('a', { class: 'btn-icon', href: mapsUrl(a.site_address, a.site_city), target: '_blank', rel: 'noopener', title: 'Navigacija' }, icon('map')) : null,
      h('a', { class: 'btn-icon', href: `/api/appointments/${a.id}/ics`, title: 'Dodaj v koledar telefona' }, icon('download')),
      !a.done ? h('button', { class: 'btn-icon', title: 'Opravljeno', onclick: async () => { await put(`/api/appointments/${a.id}`, { done: 1 }); reload(); } }, icon('check')) : null));
}

function timeGrid(days, items) {
  const HOUR = 48; // višina ure v px
  let first = 7, last = 19;
  for (const a of items) {
    const s = new Date(a.start * 1000), e = new Date((a.end || a.start + 3600) * 1000);
    first = Math.min(first, s.getHours()); last = Math.max(last, e.getHours() + (e.getMinutes() ? 1 : 0));
  }
  last = Math.min(24, Math.max(last, first + 8));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const today = dayStart(new Date());
  const now = new Date();

  const cols = days.map(day => {
    const list = items.filter(a => a.start >= ts(day) && a.start < ts(day) + DAY_S).sort((a, b) => a.start - b.start);
    // prekrivajoče se termine razporedimo drug ob drugega; ozki so samo tisti, ki se res prekrivajo
    const placed = [];
    let cluster = [], lanes = [], clusterEnd = 0;
    const closeCluster = () => { for (const p of cluster) p.n = lanes.length; cluster = []; lanes = []; };
    for (const a of list) {
      const end = a.end || a.start + 3600;
      if (cluster.length && a.start >= clusterEnd) closeCluster();
      let lane = lanes.findIndex(l => l <= a.start);
      if (lane < 0) { lane = lanes.length; lanes.push(end); } else lanes[lane] = end;
      const p = { a, end, lane, n: 1 };
      cluster.push(p); placed.push(p);
      clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end);
    }
    closeCluster();
    const top = s => ((s - ts(day)) / 3600 - first) * HOUR;
    const col = h('div', { class: `cal-col${sameDay(day, today) ? ' today' : ''}`, style: { height: `${hours.length * HOUR}px` },
      onclick: e => {
        if (e.target !== col) return;
        const y = e.offsetY; const mins = Math.floor((y / HOUR) * 2) * 30;
        newAt(day, first + Math.floor(mins / 60), mins % 60);
      } },
      placed.map(({ a, end, lane, n }) => {
        const hgt = Math.max(22, ((end - a.start) / 3600) * HOUR - 2);
        return h('button', {
          class: `cal-ev t-${a.type || 'other'}${a.done ? ' done' : ''}${hgt < 40 ? ' short' : ''}`,
          title: `${hm(a.start)}–${hm(end)} ${apptTitle(a)}${a.customer_name ? ' · ' + a.customer_name : ''}`,
          style: { top: `${Math.max(0, top(a.start))}px`, height: `${hgt}px`, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` },
          onclick: e => { e.stopPropagation(); appointmentDialog(a); } },
          hgt < 40 ? h('strong', {}, `${hm(a.start)} ${apptTitle(a)}`)
            : [h('strong', {}, apptTitle(a)), h('span', {}, `${hm(a.start)}–${hm(end)}${a.customer_name ? ' · ' + a.customer_name : ''}`)]);
      }),
      sameDay(day, today) && now.getHours() >= first && now.getHours() < last
        ? h('div', { class: 'cal-now', style: { top: `${(now.getHours() + now.getMinutes() / 60 - first) * HOUR}px` } }) : null);
    return col;
  });

  return h('div', { class: `cal-grid${days.length === 1 ? ' one' : ''}`, style: `--days:${days.length}` },
    h('div', { class: 'cal-grid-head' }, h('div', {}),
      days.map(d => h('button', { class: `cal-gh${sameDay(d, today) ? ' today' : ''}`, onclick: () => { cal.selected = d; cal.cursor = d; cal.view = 'mesec'; reload(); }, title: 'Prikaži v mesecu' },
        h('span', {}, DOW[(d.getDay() + 6) % 7]), h('b', {}, String(d.getDate()))))),
    h('div', { class: 'cal-grid-body' },
      h('div', { class: 'cal-hours' }, hours.map(hh => h('div', { style: { height: `${HOUR}px` } }, `${String(hh).padStart(2, '0')}:00`))),
      cols));
}

function agenda(items) {
  const byDay = new Map();
  for (const a of items.filter(x => !x.done).sort((x, y) => x.start - y.start)) {
    const k = dayStart(new Date(a.start * 1000)).getTime();
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(a);
  }
  if (!byDay.size) return emptyState('V naslednjih 90 dneh ni terminov', 'Dodajte termin z gumbom »Termin« ali v pogledu meseca.');
  const today = dayStart(new Date());
  return h('div', {}, [...byDay].map(([k, list]) => {
    const d = new Date(k);
    return h('div', { class: `cal-day ${sameDay(d, today) ? 'today' : ''}` },
      h('h3', {}, fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }), sameDay(d, today) ? ' · danes' : ''),
      h('div', { class: 'list' }, list.map(apptRow)));
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
// skupine v vrstnem redu, kot jih uporabljamo pri delu; ostale abecedno, »Drugo« na koncu
const GROUP_ORDER = ['Videonadzor', 'Alarmi', 'Domofoni', 'Kontrola pristopa', 'Omrežje'];
const groupRank = g => { const i = GROUP_ORDER.indexOf(g); return i >= 0 ? i : g === 'Drugo' ? 999 : 100; };
/** Kategorije »Skupina › Podskupina« kot izbirnik s skupinami: najprej vsa skupina, nato podskupine. */
export function groupedCategoryOptions(cats, cur) {
  const groups = new Map();
  for (const c of cats) {
    const [g, ...sub] = String(c.category).split(' › ');
    if (!groups.has(g)) groups.set(g, { n: 0, subs: [] });
    const G = groups.get(g); G.n += c.n;
    if (sub.length) G.subs.push({ value: c.category, label: sub.join(' › '), n: c.n });
  }
  return [...groups].sort((a, b) => groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0], 'sl')).map(([g, G]) =>
    h('optgroup', { label: g },
      h('option', { value: g, selected: g === cur }, `${g} – vse (${G.n})`),
      G.subs.sort((a, b) => a.label.localeCompare(b.label, 'sl')).map(sub => h('option', { value: sub.value, selected: sub.value === cur }, `\u2003${sub.label} (${sub.n})`))));
}

// stolpci kataloga in razvrščanje (klik na glavo stolpca; ponovni klik obrne smer)
const marginOf = p => (p.purchase_price > 0 && p.price > 0 ? (p.price - p.purchase_price) / p.price : null);
const CAT_COLS = [
  { key: 'sku', label: 'Šifra', cls: 'hide-m', get: p => p.sku || '' },
  { key: 'name', label: 'Naziv', get: p => p.name || '' },
  { key: 'brand', label: 'Znamka', cls: 'hide-m', get: p => p.brand || '' },
  { key: 'supplier_price', label: 'Cena dobavitelja', cls: 'num hide-m', get: p => (p.supplier ? Number(p.supplier_price) || null : null) },
  { key: 'purchase_price', label: 'Nabavna', cls: 'num hide-m', get: p => Number(p.purchase_price) || 0 },
  { key: 'price', label: 'Prodajna', cls: 'num', get: p => Number(p.price) || 0 },
  { key: 'margin', label: 'Marža', cls: 'num hide-m', get: marginOf },
  { key: 'stock', label: 'Zaloga', cls: 'num', get: p => (p.track_stock ? Number(p.stock) || 0 : null) },
];
// razvrščanje po popustu je samo v izbirniku (brez lastnega stolpca)
const EXTRA_SORTS = { discount: { key: 'discount', get: p => (p.supplier_old_price > p.supplier_price && p.supplier_price > 0 ? 1 - p.supplier_price / p.supplier_old_price : null) } };
/** Cena pri dobavitelju (z DDV): ob akciji prečrtana redna cena in znižana cena. */
function supplierPriceCell(p) {
  if (!p.supplier) return '–';
  if (!(p.supplier_price > 0)) return h('span', { class: 'muted', title: 'Cena še ni prebrana – zaženite uvoz ali »Samo dopolni manjkajoče cene«' }, 'ni cene');
  return h('div', { class: 'sup-price' },
    p.supplier_old_price > p.supplier_price ? h('del', {}, money(p.supplier_old_price)) : null,
    h('span', { class: p.supplier_old_price > p.supplier_price ? 'sale' : '' }, money(p.supplier_price)),
    h('small', { class: 'muted' }, 'z DDV'));
}
function saleBadge(p) {
  if (!(p.supplier_old_price > p.supplier_price && p.supplier_price > 0)) return null;
  const pct = Math.round((1 - p.supplier_price / p.supplier_old_price) * 100);
  return h('div', { class: 'sale-line' }, h('span', { class: 'badge sale-badge' }, `akcija −${pct} %`),
    h('span', { class: 'sale-m' }, h('del', {}, money(p.supplier_old_price)), ' ', money(p.supplier_price), ' z DDV'));
}
const SORT_KEY = 'v1-catalog-sort';
const loadSort = () => { try { return JSON.parse(localStorage.getItem(SORT_KEY)) || { key: 'category', dir: 1 }; } catch { return { key: 'category', dir: 1 }; } };
const coll = new Intl.Collator('sl', { numeric: true, sensitivity: 'base' });

export async function pageCatalog(page) {
  const search = h('input', { type: 'search', placeholder: 'Išči po nazivu, šifri, proizvajalcu, lastnostih', style: { maxWidth: '360px' } });
  const catSel = h('select', { style: { maxWidth: '320px' }, 'aria-label': 'Kategorija' }, h('option', { value: '' }, 'Vse kategorije'));
  const info = h('div', { class: 'muted', style: { fontSize: '12.5px', margin: '6px 0 0' } });
  const tbody = h('tbody');
  const theadRow = h('tr');
  let rows = [];
  let sort = loadSort();
  const sortSel = select([['category', 'Razvrsti: po kategorijah'], ['name', 'Naziv A–Ž'], ['-name', 'Naziv Ž–A'], ['brand', 'Znamka'], ['price', 'Cena: najnižja'], ['-price', 'Cena: najvišja'], ['purchase_price', 'Nabavna: najnižja'], ['-discount', 'Akcije najprej'], ['-margin', 'Marža: najvišja'], ['-stock', 'Zaloga: največja'], ['sku', 'Šifra']],
    `${sort.dir < 0 ? '-' : ''}${sort.key}`, { 'aria-label': 'Razvrščanje', class: 'cat-sort' });
  sortSel.onchange = () => { const v = sortSel.value; setSort(v.replace(/^-/, ''), v.startsWith('-') ? -1 : 1); };

  const setSort = (key, dir) => {
    sort = { key, dir };
    try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch { /* */ }
    const v = `${dir < 0 ? '-' : ''}${key}`;
    if ([...sortSel.options].some(o => o.value === v)) sortSel.value = v;
    render();
  };
  const renderHead = () => {
    clear(theadRow, CAT_COLS.map(c => {
      const active = sort.key === c.key;
      return h('th', { class: `${c.cls || ''} sortable${active ? ' sorted' : ''}`, 'aria-sort': active ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
        h('button', { type: 'button', title: `Razvrsti po stolpcu ${c.label}`, onclick: () => setSort(c.key, active ? -sort.dir : (c.cls || '').includes('num') ? -1 : 1) },
          c.label, h('span', { class: 'sort-ind', 'aria-hidden': 'true' }, active ? (sort.dir > 0 ? '▲' : '▼') : '↕')));
    }), h('th', { class: 'hide-m' }, sort.key !== 'category' ? h('button', { type: 'button', class: 'sort-reset', onclick: () => setSort('category', 1), title: 'Nazaj na razvrstitev po kategorijah' }, 'Po kategorijah') : null));
  };
  const sorted = () => {
    if (sort.key === 'category') return rows; // strežnik vrne urejeno po kategoriji in nazivu
    const col = CAT_COLS.find(c => c.key === sort.key) || EXTRA_SORTS[sort.key] || CAT_COLS[1];
    return [...rows].sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      // prazne vrednosti vedno na konec
      if (x == null || x === '') return (y == null || y === '') ? 0 : 1;
      if (y == null || y === '') return -1;
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : coll.compare(String(x), String(y));
      return r * sort.dir || coll.compare(a.name || '', b.name || '');
    });
  };
  const render = () => {
    renderHead();
    let lastGroup = null;
    const grouped = sort.key === 'category';
    const groupRow = p => { if (!grouped) return null; const g = p.category || 'Brez kategorije'; if (g === lastGroup) return null; lastGroup = g; return h('tr', { class: 'cat-group' }, h('td', { colspan: 10 }, g.replace(' › ', '  ›  '))); };
    clear(tbody, sorted().map(p => [groupRow(p), h('tr', { class: 'tap-row', style: { opacity: p.active ? 1 : 0.5 }, onclick: e => { if (!e.target.closest('a,button,img') && matchMedia('(max-width: 860px)').matches) productDialog(p); } },
      h('td', { class: 'mono hide-m' }, p.sku || ''),
      h('td', {}, h('div', { class: 'prod-cell' }, productThumb(p), h('div', { class: 'prod-txt' }, h('strong', {}, p.name), h('div', { class: 'muted', style: { fontSize: '12.5px' } },
        [grouped ? null : p.category, p.supplier_category ? `pri dobavitelju: ${p.supplier_category}` : null].filter(Boolean).join(' · '),
        p.supplier === 'digitklik' ? h('span', {}, (grouped ? null : p.category) || p.supplier_category ? ' · ' : '', h('a', { href: p.supplier_url, target: '_blank', rel: 'noopener' }, 'digitklik.si'), p.supplier_stock ? ` (zaloga ${p.supplier_stock})` : '') : null),
        saleBadge(p)))),
      h('td', { class: 'hide-m' }, p.brand || '–'),
      h('td', { class: 'num hide-m' }, supplierPriceCell(p)),
      h('td', { class: 'num hide-m' }, money(p.purchase_price)),
      h('td', { class: 'num' }, money(p.price), h('div', { class: 'muted', style: { fontSize: '12px' } }, `/${p.unit}`)),
      h('td', { class: 'num hide-m' }, marginOf(p) != null ? `${Math.round(marginOf(p) * 100)} %` : '–'),
      h('td', { class: 'num' }, p.track_stock ? h('span', { style: { color: p.min_stock > 0 && p.stock <= p.min_stock ? 'var(--warn)' : '' } }, `${p.stock}`) : '–'),
      h('td', { class: 'actions hide-m' }, h('button', { class: 'btn btn-sm', onclick: () => productDialog(p) }, 'Uredi')))]).flat().filter(Boolean));
  };
  const loadCats = async () => {
    const cats = await get('/api/products/categories').catch(() => []);
    const cur = catSel.value;
    clear(catSel, h('option', { value: '' }, 'Vse kategorije'), groupedCategoryOptions(cats, cur));
  };
  const load = async () => {
    rows = await get(`/api/products?all=1&limit=1500&q=${encodeURIComponent(search.value)}&category=${encodeURIComponent(catSel.value)}`);
    info.textContent = rows.length >= 1500 ? 'Prikazanih je prvih 1500 izdelkov – zožite iskanje ali izberite kategorijo.' : `${rows.length} izdelkov`;
    render();
  };
  search.oninput = debounce(load, 250);
  catSel.onchange = load;
  const isAdmin = F.me.role === 'admin';
  clear(page,
    head('Katalog izdelkov in storitev', 'Cene in zaloga. Postavke se samodejno ponudijo pri vnosu ponudb, nalogov in računov.',
      isAdmin ? h('button', { class: 'btn hide-m', onclick: () => digitklikDialog(async () => { await loadCats(); await load(); }) }, icon('download', 16), 'Uvoz iz digitklik.si') : null,
      h('button', { class: 'btn hide-m', onclick: importDialog }, 'Uvoz iz CSV'),
      h('button', { class: 'btn btn-primary', onclick: () => productDialog() }, icon('plus', 16), 'Nov izdelek')),
    h('div', { class: 'row cat-filters', style: { marginBottom: '12px', gap: '8px', flexWrap: 'wrap' } }, search, catSel, sortSel),
    info,
    h('div', { class: 'table-wrap' }, h('table', { class: 'cat-table' }, h('thead', {}, theadRow), tbody)));
  renderHead();
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
  // artikli, pri katerih cene v seznamu ni bilo: preberemo jo s strani izdelka
  const fillPrices = async opts => {
    let fixed = 0, total = null;
    for (;;) {
      if (cancel) break;
      const r = await post('/api/import/digitklik/prices', opts);
      fixed += r.fixed;
      if (r.diags?.length) errBox.textContent = `Cene ni bilo mogoče prebrati (podrobnosti za podporo):\n${r.diags.join('\n')}`;
      if (total == null) total = r.remaining + r.checked;
      setPct(Math.min(99, Math.round(((total - r.remaining) / Math.max(total, 1)) * 100)));
      status.textContent = `Dopolnjujem cene s strani izdelkov: ${total - r.remaining} / ${total}`;
      if (!r.checked || !r.remaining) break;
    }
    return fixed;
  };
  modal('Uvoz iz digitklik.si', body, {
    wide: true,
    onClose: () => { cancel = true; },
    actions: [
      { label: 'Zapri', onClick: () => { cancel = true; } },
      { label: 'Samo dopolni manjkajoče cene', close: false, onClick: async () => {
        if (running) return false;
        running = true; cancel = false;
        try {
          const n = await fillPrices({ margin: Number(marginIn.value) || 0, update_prices: upd.input.checked, started: Math.floor(Date.now() / 1000) });
          status.textContent = `Dopolnjenih cen: ${n}.`; toast('Cene so dopolnjene'); await onDone?.();
        } finally { running = false; }
        return false;
      } },
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
          const priced = await fillPrices({ margin, update_prices: upd.input.checked, started });
          if (cancel) { status.textContent += ' · prekinjeno'; return false; }
          const fin = await post('/api/import/digitklik/finish', { started, margin, archive_missing: arch.input.checked && tot.errors.length === 0, stats: tot });
          setPct(100);
          status.textContent = `Končano: ${fin.count} aktivnih izdelkov z digitklik.si (novih ${tot.inserted}, posodobljenih ${tot.updated}${priced ? `, cen dopolnjenih s strani izdelka ${priced}` : ''}${fin.archived ? `, neaktivnih ${fin.archived}` : ''}).`;
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
      field('Vrsta opreme (za vpis na objekt)', select([['', '–'], ...Object.entries(F.meta.equipment_types)], p.equipment_type || '', { name: 'equipment_type' })),
      field('Slika (spletni naslov)', h('input', { name: 'image_url', value: p.image_url || '', placeholder: 'https://…', inputmode: 'url' }), p.supplier ? 'Ob naslednjem uvozu se posodobi s strani dobavitelja.' : null)),
    p.image_url ? h('div', { class: 'prod-preview' }, productThumb(p, 'pthumb-lg')) : null,
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
      installPanel(),
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
