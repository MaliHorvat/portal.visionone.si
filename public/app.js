// VisionOne Field – ogrodje, nadzorna plošča, stranke in objekti
import { h, $, clear, icon, get, post, put, del, toast, toastErr, modal, confirmDialog, field, select, toggle, formData, ensureLogin, logout, toggleTheme, emptyState, debounce } from './lib/core.js';
import { pageDocuments, pageDocument, newDocument } from './pages-docs.js';
import { pageCalendar, pageCatalog, pageSettings, appointmentDialog } from './pages-more.js';
import { planEditor, networkMap } from './plan.js';
import { pageInquiries, TOPICS as INQ_TOPICS } from './pages-inquiries.js';

export const F = { me: null, meta: null, company: null };
export const money = n => `${new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)} €`;
export const dateSl = d => (d ? new Date(String(d).length === 10 ? `${d}T12:00:00` : Number(d) * 1000).toLocaleDateString('sl-SI') : '–');
export const timeSl = ts => new Date(ts * 1000).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
export const todayIso = () => new Date().toLocaleDateString('sv-SE');
export const mapsUrl = (...parts) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(', '))}`;
export const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const go = path => { location.hash = `#${path}`; };

const NAV = [['/', 'Danes', 'home'], ['/povprasevanja', 'Povpraševanja', 'bookmark'], ['/stranke', 'Stranke', 'users'], ['/dokumenti/racuni', 'Dokumenti', 'list'], ['/koledar', 'Koledar', 'bell'], ['/katalog', 'Katalog', 'disk'], ['/nastavitve', 'Nastavitve', 'settings']];
let main;

async function boot() {
  F.me = await ensureLogin('VisionOne Field', 'Stranke, ponudbe, nalogi in računi');
  [F.meta, F.company] = await Promise.all([get('/api/meta'), get('/api/company')]);
  document.title = `${F.company.name} – Field`;
  main = h('main', { class: 'f-main' });
  const side = h('aside', { class: 'f-side' },
    h('div', { class: 'f-brand' }, h('span', { class: 'mark' }), h('div', {}, h('strong', {}, 'VisionOne Field'), h('span', {}, F.company.name))),
    h('nav', { class: 'f-nav', 'aria-label': 'Glavni meni' }, NAV.map(([p, l, i]) => h('a', { href: `#${p}`, 'data-p': p }, icon(i), l))),
    h('div', { class: 'f-foot' }, h('span', {}, F.me.full_name || F.me.username),
      h('button', { class: 'btn-icon', title: 'Tema', onclick: () => toggleTheme('v1-theme-field') }, icon('sun')),
      h('button', { class: 'btn-icon', title: 'Odjava', onclick: logout }, icon('logout'))));
  const bottom = h('nav', { class: 'f-bottom', 'aria-label': 'Meni' }, NAV.filter(n => !['/katalog', '/povprasevanja'].includes(n[0])).map(([p, l, i]) => h('a', { href: `#${p}`, 'data-p': p }, icon(i, 22), l)));
  clear($('#app'), h('div', { class: 'f-app' }, side, main), bottom);
  window.addEventListener('hashchange', route);
  route();
}

async function route() {
  const path = location.hash.slice(1) || '/';
  for (const a of document.querySelectorAll('[data-p]')) {
    const p = a.dataset.p;
    const on = p === '/' ? path === '/' : path.startsWith(p) || (p.startsWith('/dokumenti') && path.startsWith('/dokument')) || (p === '/stranke' && (path.startsWith('/stranka') || path.startsWith('/objekt')));
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  const page = h('div', { class: 'f-page' });
  clear(main, page);
  window.scrollTo(0, 0);
  const m = (re) => path.match(re);
  let r;
  try {
    if (path === '/') await pageToday(page);
    else if (path === '/stranke') await pageCustomers(page);
    else if ((r = m(/^\/stranka\/(\d+)$/))) await pageCustomer(page, Number(r[1]));
    else if ((r = m(/^\/objekt\/(\d+)$/))) await pageSite(page, Number(r[1]));
    else if ((r = m(/^\/dokumenti\/(\w+)$/))) await pageDocuments(page, r[1]);
    else if ((r = m(/^\/dokument\/(\d+)$/))) await pageDocument(page, Number(r[1]));
    else if (path === '/koledar') await pageCalendar(page);
    else if (path === '/povprasevanja') await pageInquiries(page);
    else if ((r = m(/^\/povprasevanja\/(\w+)$/))) await pageInquiries(page, r[1]);
    else if (path === '/katalog') await pageCatalog(page);
    else if (path === '/nastavitve') await pageSettings(page);
    else clear(page, emptyState('Stran ne obstaja', '', h('a', { class: 'btn', href: '#/' }, 'Na začetek')));
  } catch (e) { toastErr(e); }
}
export const reload = () => route();

export function head(title, sub, ...actions) {
  return h('div', { class: 'f-head' }, h('h1', {}, title), h('span', { class: 'spacer', style: { flex: 1 } }), ...actions, sub ? h('div', { class: 'sub' }, sub) : null);
}

// ======================= DANES =======================
async function pageToday(page) {
  const d = await get('/api/dashboard');
  const hr = new Date().getHours();
  const greet = hr < 10 ? 'Dobro jutro' : hr < 18 ? 'Dober dan' : 'Dober večer';
  const apptRow = a => h('div', { class: `appt ${a.done ? 'done' : ''}` },
    h('div', { class: 'time' }, timeSl(a.start), a.end ? h('small', {}, `do ${timeSl(a.end)}`) : null),
    h('div', { style: { minWidth: 0 } }, h('strong', {}, a.title || 'Termin'), h('div', { class: 'muted', style: { fontSize: '13.5px' } }, [a.customer_name, a.site_name].filter(Boolean).join(' · ')),
      a.notes ? h('div', { class: 'muted', style: { fontSize: '13px' } }, a.notes) : null),
    h('div', { class: 'acts' },
      a.site_address ? h('a', { class: 'btn-icon', href: mapsUrl(a.site_address, a.site_city), target: '_blank', rel: 'noopener', title: 'Navigacija' }, icon('map')) : null,
      a.site_id ? h('a', { class: 'btn-icon', href: `#/objekt/${a.site_id}`, title: 'Objekt' }, icon('home')) : null,
      !a.done ? h('button', { class: 'btn-icon', title: 'Opravljeno', onclick: async () => { await put(`/api/appointments/${a.id}`, { done: 1 }); reload(); } }, icon('check')) : null));
  const alertList = (title, items, render, emptyText) => items.length ? h('div', {}, h('div', { class: 'section-title' }, h('h2', {}, title), h('span', { class: 'badge warn plain' }, items.length)), h('div', { class: 'list' }, items.map(render))) : null;
  clear(page,
    head(`${greet}, ${(F.me.full_name || F.me.username).split(' ')[0]}`, new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    h('div', { class: 'quick' },
      h('button', { onclick: () => customerDialog() }, icon('users', 22), 'Nova stranka'),
      h('button', { onclick: () => newDocument('workorder') }, icon('edit', 22), 'Delovni nalog'),
      h('button', { onclick: () => newDocument('quote') }, icon('list', 22), 'Ponudba'),
      h('button', { onclick: () => appointmentDialog() }, icon('bell', 22), 'Termin')),
    d.inquiries?.length ? h('div', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Nova povpraševanja'), h('span', { class: 'badge info plain' }, d.inquiries.length), h('span', { class: 'spacer' }), h('a', { class: 'btn btn-sm', href: '#/povprasevanja' }, 'Vsa povpraševanja')),
      h('div', { class: 'list' }, d.inquiries.map(i => h('a', { class: 'list-item', href: '#/povprasevanja' },
        h('div', { class: 'main' }, h('strong', {}, i.company ? `${i.name} · ${i.company}` : i.name), h('small', {}, String(i.message || '').slice(0, 110))),
        h('div', { class: 'end' }, INQ_TOPICS[i.topic] || '', h('small', {}, new Date(i.created_at * 1000).toLocaleDateString('sl-SI'))))))) : null,
    h('div', { class: 'section-title' }, h('h2', {}, 'Današnji termini'), h('span', { class: 'spacer' }), h('a', { class: 'btn btn-sm', href: '#/koledar' }, 'Koledar')),
    d.today.length ? h('div', { class: 'list' }, d.today.map(apptRow)) : h('div', { class: 'list' }, h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Danes ni terminov.')),
    d.upcoming.length ? h('div', {}, h('div', { class: 'section-title' }, h('h2', {}, 'Prihodnji dnevi')), h('div', { class: 'list' }, d.upcoming.map(a => h('a', { class: 'list-item', href: a.customer_id ? `#/stranka/${a.customer_id}` : '#/koledar' },
      h('div', { class: 'main' }, h('strong', {}, a.title || 'Termin'), h('small', {}, [a.customer_name, a.site_name].filter(Boolean).join(' · '))),
      h('div', { class: 'end' }, new Date(a.start * 1000).toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'numeric' }), h('small', {}, timeSl(a.start))))))) : null,
    h('div', { class: 'section-title' }, h('h2', {}, 'Poslovanje')),
    h('div', { class: 'kpis' },
      h('div', { class: 'kpi' }, h('b', {}, money(d.revenue.month)), h('span', {}, 'Prihodki ta mesec (brez DDV)')),
      h('div', { class: 'kpi' }, h('b', {}, money(d.revenue.year)), h('span', {}, 'Prihodki letos')),
      h('div', { class: 'kpi' }, h('b', { style: { color: d.revenue.unpaid > 0 ? 'var(--warn)' : '' } }, money(d.revenue.unpaid)), h('span', {}, 'Neplačano')),
      h('div', { class: 'kpi' }, h('b', {}, `${d.counts.customers} / ${d.counts.sites}`), h('span', {}, 'Strank / objektov'))),
    alertList('Zapadli računi', d.overdue_invoices, i => h('a', { class: 'list-item', href: `#/dokument/${i.id}` }, h('div', { class: 'main' }, h('strong', {}, `${i.number} · ${i.customer_name}`), h('small', {}, `Zapadel ${dateSl(i.due_date)}`)), h('div', { class: 'end', style: { color: 'var(--alarm)' } }, money(i.total - i.paid)))),
    alertList('Servisni pregledi', d.services_due, s => h('a', { class: 'list-item', href: `#/objekt/${s.id}` }, h('div', { class: 'main' }, h('strong', {}, s.customer_name), h('small', {}, s.name)), h('div', { class: 'end', style: { color: s.overdue ? 'var(--alarm)' : 'var(--warn)' } }, s.overdue ? 'zamujen' : 'kmalu', h('small', {}, dateSl(s.next_service))))),
    alertList('Odprti delovni nalogi', d.open_workorders, w => h('a', { class: 'list-item', href: `#/dokument/${w.id}` }, h('div', { class: 'main' }, h('strong', {}, `${w.number} · ${w.customer_name || ''}`), h('small', {}, w.title || '')), h('div', { class: 'end' }, F.meta.status.workorder[w.status], h('small', {}, dateSl(w.date))))),
    alertList('Ponudbe v čakanju', d.open_quotes, w => h('a', { class: 'list-item', href: `#/dokument/${w.id}` }, h('div', { class: 'main' }, h('strong', {}, `${w.number} · ${w.customer_name || ''}`), h('small', {}, dateSl(w.date))), h('div', { class: 'end' }, money(w.total), h('small', {}, F.meta.status.quote[w.status])))),
    alertList('Garancije, ki potečejo v 60 dneh', d.warranties, e => h('a', { class: 'list-item', href: `#/objekt/${e.site_id}` }, h('div', { class: 'main' }, h('strong', {}, [e.name, e.model].filter(Boolean).join(' · ') || F.meta.equipment_types[e.type]), h('small', {}, `${e.customer_name} · ${e.site_name}`)), h('div', { class: 'end' }, dateSl(e.warranty_until)))),
    alertList('Nizka zaloga', d.low_stock, p => h('a', { class: 'list-item', href: '#/katalog' }, h('div', { class: 'main' }, h('strong', {}, p.name)), h('div', { class: 'end', style: { color: 'var(--warn)' } }, `${p.stock} ${p.unit}`, h('small', {}, `min. ${p.min_stock}`)))));
}

// ======================= STRANKE =======================
async function pageCustomers(page) {
  const search = h('input', { type: 'search', placeholder: 'Išči po nazivu, kraju, telefonu, objektu …', 'aria-label': 'Iskanje strank', style: { maxWidth: '420px' } });
  const list = h('div', { class: 'list' });
  const load = async () => {
    const rows = await get(`/api/customers?q=${encodeURIComponent(search.value)}`);
    clear(list, rows.length ? rows.map(c => h('a', { class: 'list-item', href: `#/stranka/${c.id}` },
      h('span', { class: 'avatar' }, initials(c.name)),
      h('div', { class: 'main' }, h('strong', {}, c.name), h('small', {}, [c.city, c.phone, c.tags].filter(Boolean).join(' · ') || '–')),
      h('div', { class: 'end' }, `${c.sites} ${c.sites === 1 ? 'objekt' : c.sites === 2 ? 'objekta' : c.sites < 5 && c.sites > 2 ? 'objekti' : 'objektov'}`, c.unpaid > 0 ? h('small', { style: { color: 'var(--warn)' } }, `odprto ${money(c.unpaid)}`) : null)))
      : [emptyState(search.value ? 'Ni zadetkov' : 'Ni strank', search.value ? 'Poskusite z drugim iskalnim nizom.' : 'Dodajte prvo stranko in njen objekt.', h('button', { class: 'btn btn-primary', onclick: () => customerDialog() }, 'Nova stranka'))]);
  };
  search.oninput = debounce(load, 200);
  clear(page, head('Stranke', null, h('a', { class: 'btn hide-m', href: '/api/export/customers.csv' }, icon('download', 16), 'CSV'), h('button', { class: 'btn btn-primary', onclick: () => customerDialog() }, icon('plus', 16), 'Nova stranka')),
    h('div', { style: { marginBottom: '12px' } }, search), list);
  load();
  search.focus();
}

export function customerDialog(c = null, onCreated = null) {
  const type = select([['company', 'Podjetje'], ['person', 'Fizična oseba']], c?.type || 'company', { name: 'type' });
  const contacts = JSON.parse(c?.contacts_json || '[]');
  const contactBox = h('div');
  const renderContacts = () => clear(contactBox, contacts.map((ct, i) => h('div', { class: 'row', style: { marginBottom: '6px', flexWrap: 'nowrap' } },
    h('input', { placeholder: 'Ime', value: ct.name || '', oninput: e => { ct.name = e.target.value; } }),
    h('input', { placeholder: 'Telefon', value: ct.phone || '', oninput: e => { ct.phone = e.target.value; } }),
    h('input', { placeholder: 'E-pošta', value: ct.email || '', oninput: e => { ct.email = e.target.value; } }),
    h('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Odstrani', onclick: () => { contacts.splice(i, 1); renderContacts(); } }, icon('x', 16)))),
    h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { contacts.push({}); renderContacts(); } }, icon('plus', 14), 'Kontaktna oseba'));
  renderContacts();
  const f = h('form', { autocomplete: 'off' },
    h('div', { class: 'form-grid' },
      field('Vrsta', type), field('Naziv / ime in priimek', h('input', { name: 'name', value: c?.name || '', required: true })),
      field('Davčna številka', h('input', { name: 'tax_id', value: c?.tax_id || '' })), field('Matična številka', h('input', { name: 'reg_no', value: c?.reg_no || '' })),
      field('Naslov', h('input', { name: 'address', value: c?.address || '' })), field('Poštna številka', h('input', { name: 'post', value: c?.post || '', inputmode: 'numeric' })),
      field('Kraj', h('input', { name: 'city', value: c?.city || '' })), field('Telefon', h('input', { name: 'phone', type: 'tel', value: c?.phone || '' })),
      field('E-pošta', h('input', { name: 'email', type: 'email', value: c?.email || '' })), field('Rok plačila (dni)', h('input', { name: 'payment_days', type: 'number', value: c?.payment_days || '', placeholder: String(F.company.payment_days || 8) })),
      field('Oznake', h('input', { name: 'tags', value: c?.tags || '', placeholder: 'npr. VIP, vzdrževalna pogodba' }))),
    (() => { const t = toggle(c?.vat_payer, 'Stranka je zavezanec za DDV'); t.input.name = 'vat_payer'; return t; })(),
    field('Opombe', h('textarea', { name: 'notes' }, c?.notes || '')),
    h('h3', {}, 'Kontaktne osebe'), contactBox);
  modal(c?.id ? 'Uredi stranko' : 'Nova stranka', f, {
    wide: true,
    actions: [{ label: 'Prekliči' }, { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
      const d = formData(f);
      if (!d.name) throw new Error('Vpišite naziv stranke');
      d.contacts_json = JSON.stringify(contacts.filter(x => x.name || x.phone || x.email));
      if (c?.id) { await put(`/api/customers/${c.id}`, d); toast('Stranka je shranjena'); reload(); }
      else { const r = await post('/api/customers', d); await onCreated?.(r.id); toast('Stranka je dodana'); go(`/stranka/${r.id}`); }
    } }],
  });
}

async function pageCustomer(page, id) {
  const c = await get(`/api/customers/${id}`);
  const contacts = JSON.parse(c.contacts_json || '[]');
  const T = F.meta.doc_types, ST = F.meta.status;
  clear(page,
    h('a', { class: 'back', href: '#/stranke' }, '‹ Stranke'),
    head(c.name, [c.type === 'person' ? 'Fizična oseba' : 'Podjetje', c.tax_id ? `${c.vat_payer ? 'ID za DDV' : 'Davčna št.'} ${c.tax_id}` : null, [c.address, [c.post, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
      c.phone ? h('a', { class: 'btn', href: `tel:${c.phone.replace(/\s/g, '')}` }, 'Pokliči') : null,
      c.email ? h('a', { class: 'btn hide-m', href: `mailto:${c.email}` }, 'E-pošta') : null,
      h('button', { class: 'btn', onclick: () => customerDialog(c) }, icon('edit', 16), 'Uredi')),
    contacts.length ? h('div', { class: 'list', style: { marginBottom: '8px' } }, contacts.map(ct => h('div', { class: 'list-item' }, h('div', { class: 'main' }, h('strong', {}, ct.name || '–'), h('small', {}, [ct.phone, ct.email].filter(Boolean).join(' · '))),
      ct.phone ? h('a', { class: 'btn-icon', href: `tel:${ct.phone.replace(/\s/g, '')}`, title: 'Pokliči' }, '☎') : null))) : null,
    c.notes ? h('p', { class: 'muted', style: { whiteSpace: 'pre-wrap' } }, c.notes) : null,
    h('div', { class: 'section-title' }, h('h2', {}, 'Objekti'), h('span', { class: 'spacer' }), h('button', { class: 'btn btn-sm', onclick: () => siteDialog({ customer_id: c.id }) }, icon('plus', 14), 'Objekt')),
    h('div', { class: 'list' }, c.sites.length ? c.sites.map(s => h('a', { class: 'list-item', href: `#/objekt/${s.id}` },
      h('div', { class: 'main' }, h('strong', {}, s.name), h('small', {}, [s.address, s.city].filter(Boolean).join(', ') || '–')),
      h('div', { class: 'end' }, `${s.equipment_count} naprav`, s.next_service ? h('small', { style: { color: s.next_service < todayIso() ? 'var(--alarm)' : '' } }, `servis ${dateSl(s.next_service)}`) : null))) : h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Ni objektov.')),
    h('div', { class: 'section-title' }, h('h2', {}, 'Dokumenti'), h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('quote', { customer_id: c.id }) }, 'Ponudba'),
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('workorder', { customer_id: c.id }) }, 'Nalog'),
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('invoice', { customer_id: c.id }) }, 'Račun')),
    h('div', { class: 'list' }, c.documents.length ? c.documents.map(d => h('a', { class: 'list-item', href: `#/dokument/${d.id}` },
      h('div', { class: 'main' }, h('strong', {}, `${T[d.type]} ${d.number || '(osnutek)'}`), h('small', {}, `${dateSl(d.date)}${d.title ? ` · ${d.title}` : ''}`)),
      h('div', { class: 'end' }, money(d.total), h('small', {}, ST[d.type][d.status])))) : h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Ni dokumentov.')),
    h('div', { class: 'section-title' }, h('h2', {}, 'Termini'), h('span', { class: 'spacer' }), h('button', { class: 'btn btn-sm', onclick: () => appointmentDialog({ customer_id: c.id, site_id: c.sites[0]?.id }) }, icon('plus', 14), 'Termin')),
    h('div', { class: 'list' }, c.appointments.length ? c.appointments.map(a => h('div', { class: 'list-item' }, h('div', { class: 'main' }, h('strong', {}, a.title || 'Termin'), h('small', {}, a.notes || '')), h('div', { class: 'end' }, dateSl(a.start), h('small', {}, a.done ? 'opravljeno' : timeSl(a.start))))) : h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Ni terminov.')),
    F.me.role === 'admin' ? h('div', { style: { marginTop: '28px' } }, h('button', { class: 'btn btn-danger', onclick: async () => { if (await confirmDialog(`Izbrišem stranko "${c.name}" z vsemi objekti, opremo in osnutki dokumentov?`, { danger: true, ok: 'Izbriši' })) { try { await del(`/api/customers/${c.id}`); toast('Stranka je izbrisana'); go('/stranke'); } catch (e) { toastErr(e); } } } }, 'Izbriši stranko')) : null);
}

// ======================= OBJEKTI =======================
export function siteDialog(s) {
  const f = h('form', { autocomplete: 'off' },
    h('div', { class: 'form-grid' },
      field('Ime objekta', h('input', { name: 'name', value: s.name || '', placeholder: 'npr. Hiša, Proizvodnja, Skladišče' })),
      field('Vrsta sistema', h('input', { name: 'system_type', value: s.system_type || '', placeholder: 'npr. IP videonadzor, 8 kamer' })),
      field('Naslov', h('input', { name: 'address', value: s.address || '' })), field('Poštna številka', h('input', { name: 'post', value: s.post || '' })),
      field('Kraj', h('input', { name: 'city', value: s.city || '' })), field('GPS (neobvezno)', h('input', { name: 'gps', value: s.gps || '', placeholder: '46.0569, 14.5058' })),
      field('Servisni interval (mesecev, 0 = brez)', h('input', { name: 'maintenance_months', type: 'number', value: s.maintenance_months ?? 12 })),
      field('Zadnji servis', h('input', { name: 'last_service', type: 'date', value: s.last_service || '' }))),
    field('Dostop do objekta', h('textarea', { name: 'access_notes', placeholder: 'Ključ, kontakt hišnika, lokacija omare …' }, s.access_notes || '')),
    field('Zaupni podatki (šifrirano)', h('input', { name: 'secret', type: 'password', placeholder: s.has_secret ? 'shranjeno – vpišite za spremembo' : 'npr. koda alarma, geslo Wi-Fi', autocomplete: 'new-password' }), 'Shranjeno šifrirano. Vsak ogled se zabeleži.'),
    h('fieldset', {}, h('legend', {}, 'Povezava na VisionOne VMS pri stranki'),
      h('div', { class: 'form-grid' }, field('Naslov strežnika', h('input', { name: 'visionone_url', value: s.visionone_url || '', placeholder: 'https://nadzor.stranka.si' })),
        field('API žeton', h('input', { name: 'visionone_token', type: 'password', placeholder: s.has_token ? 'shranjeno' : 'v1_…', autocomplete: 'new-password' }))),
      h('small', { class: 'hint' }, 'Žeton ustvarite v VisionOne Admin → Integracije → API žetoni (vloga Opazovalec).')),
    field('Opombe', h('textarea', { name: 'notes' }, s.notes || '')));
  modal(s.id ? 'Uredi objekt' : 'Nov objekt', f, {
    wide: true,
    actions: [{ label: 'Prekliči' }, { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
      const d = formData(f);
      if (!d.name) throw new Error('Vpišite ime objekta');
      if (!d.secret) delete d.secret;
      if (!d.visionone_token) delete d.visionone_token;
      if (s.id) { await put(`/api/sites/${s.id}`, d); toast('Objekt je shranjen'); reload(); }
      else { const r = await post('/api/sites', { ...d, customer_id: s.customer_id }); go(`/objekt/${r.id}`); }
    } }],
  });
}

async function pageSite(page, id) {
  const s = await get(`/api/sites/${id}`);
  const ET = F.meta.equipment_types;
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div');
  const TABS = [['eq', `Oprema (${s.equipment.length})`], ['plan', 'Tloris'], ['net', 'Omrežna shema'], ['docs', 'Dokumenti'], ['files', 'Fotografije']];
  const show = t => {
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    history.replaceState(null, '', `#/objekt/${id}`);
    clear(body);
    if (t === 'eq') body.append(equipmentTab(s));
    if (t === 'plan') body.append(planEditor(s, reload));
    if (t === 'net') body.append(networkMap(s));
    if (t === 'docs') body.append(h('div', {}, h('div', { class: 'btn-row', style: { marginBottom: '10px' } },
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('quote', { customer_id: s.customer_id, site_id: s.id }) }, icon('plus', 14), 'Ponudba'),
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('workorder', { customer_id: s.customer_id, site_id: s.id }) }, icon('plus', 14), 'Delovni nalog'),
      h('button', { class: 'btn btn-sm', onclick: () => newDocument('invoice', { customer_id: s.customer_id, site_id: s.id }) }, icon('plus', 14), 'Račun')),
      h('div', { class: 'list' }, s.documents.length ? s.documents.map(d => h('a', { class: 'list-item', href: `#/dokument/${d.id}` }, h('div', { class: 'main' }, h('strong', {}, `${F.meta.doc_types[d.type]} ${d.number || '(osnutek)'}`), h('small', {}, `${dateSl(d.date)} ${d.title || ''}`)), h('div', { class: 'end' }, money(d.total), h('small', {}, F.meta.status[d.type][d.status]))))
        : h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Ni dokumentov za ta objekt.'))));
    if (t === 'files') body.append(filesTab(s));
  };
  for (const [k, l] of TABS) tabs.append(h('button', { role: 'tab', 'data-t': k, onclick: () => show(k) }, l));
  const vms = h('div');
  const svc = s.next_service ? (s.next_service < todayIso() ? h('span', { class: 'badge err' }, `Servis zamujen (${dateSl(s.next_service)})`) : h('span', { class: 'badge ok' }, `Naslednji servis ${dateSl(s.next_service)}`)) : h('span', { class: 'badge' }, 'Servis ni načrtovan');
  clear(page,
    h('a', { class: 'back', href: `#/stranka/${s.customer_id}` }, `‹ ${s.customer?.name || 'Stranka'}`),
    head(s.name, [s.system_type, [s.address, [s.post, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
      s.address ? h('a', { class: 'btn', href: s.gps ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.gps)}` : mapsUrl(s.address, s.post, s.city), target: '_blank', rel: 'noopener' }, icon('map', 16), 'Navigacija') : null,
      h('button', { class: 'btn', onclick: () => siteDialog(s) }, icon('edit', 16), 'Uredi')),
    h('div', { class: 'panel', style: { marginBottom: '14px' } },
      h('div', { class: 'site-meta' },
        h('div', {}, h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Vzdrževanje'), svc, ' ', h('button', { class: 'btn btn-sm', style: { marginTop: '6px' }, onclick: async () => { await post(`/api/sites/${s.id}/serviced`, {}); toast('Servis je zabeležen'); reload(); } }, icon('check', 14), 'Servis opravljen danes')),
        s.access_notes ? h('div', {}, h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Dostop'), h('div', { style: { whiteSpace: 'pre-wrap' } }, s.access_notes)) : null,
        s.has_secret ? h('div', {}, h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Zaupni podatki'), h('button', { class: 'btn btn-sm', onclick: async e => { const r = await get(`/api/sites/${s.id}/secret`); e.target.replaceWith(h('span', { class: 'pw' }, r.secret)); } }, 'Prikaži')) : null,
        h('div', {}, h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Dokumentacija'), h('div', { class: 'btn-row', style: { marginTop: '4px' } },
          h('button', { class: 'btn btn-sm', onclick: () => handoverDialog(s) }, 'Zapisnik o predaji'),
          h('button', { class: 'btn btn-sm', onclick: () => noticeDialog(s) }, 'Obvestilo o videonadzoru')))),
      s.visionone_url ? h('div', { style: { marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '10px' } }, vms) : null),
    tabs, body);
  show(location.hash.includes('plan') ? 'plan' : 'eq');
  if (s.visionone_url) loadVms(s, vms);
}

async function loadVms(s, el) {
  clear(el, h('span', { class: 'muted' }, 'Preverjam sistem VisionOne …'));
  try {
    const r = await get(`/api/sites/${s.id}/vms-status`);
    const off = r.cameras.filter(c => c.status === 'offline');
    clear(el, h('div', { class: 'vms-status' },
      h('strong', {}, `VisionOne: ${r.system_name}`),
      h('span', { class: `badge ${off.length ? 'err' : 'ok'}` }, `${r.cameras.length - off.length}/${r.cameras.length} kamer na povezavi`),
      ...r.recorders.map(x => h('span', { class: `badge ${x.status === 'online' ? 'ok' : 'err'}` }, `${x.name}${x.disks?.length ? ` · ${x.disks.map(d => d.status).join(', ')}` : ''}`)),
      ...r.pools.map(p => h('span', { class: 'badge plain' }, `${p.name}: ${Math.round((p.free / p.total) * 100) || 0} % prosto`)),
      r.alarms_24h ? h('span', { class: 'badge warn' }, `${r.alarms_24h} alarmov v 24 h`) : null,
      h('a', { class: 'btn btn-sm', href: `${s.visionone_url.replace(/\/$/, '')}/view/`, target: '_blank', rel: 'noopener' }, 'Odpri View')),
      off.length ? h('p', { style: { color: 'var(--alarm)', margin: '8px 0 0' } }, `Brez povezave: ${off.map(c => c.name).join(', ')}`) : null);
  } catch (e) { clear(el, h('span', { style: { color: 'var(--alarm)' } }, e.message)); }
}

function equipmentTab(s) {
  const ET = F.meta.equipment_types;
  const byId = Object.fromEntries(s.equipment.map(e => [e.id, e]));
  const rows = s.equipment.map(e => h('tr', {},
    h('td', {}, h('strong', {}, e.name || ET[e.type]), h('div', { class: 'eq-type' }, ET[e.type])),
    h('td', {}, [e.brand, e.model].filter(Boolean).join(' ') || '–', e.serial ? h('div', { class: 'eq-type' }, `S/N ${e.serial}`) : null),
    h('td', { class: 'mono' }, e.ip ? h('a', { href: `http://${e.ip}`, target: '_blank', rel: 'noopener' }, e.ip) : '–', e.mac ? h('div', { class: 'eq-type' }, e.mac) : null),
    h('td', { class: 'hide-m' }, e.location || '–', e.connected_to && byId[e.connected_to] ? h('div', { class: 'eq-type' }, `→ ${byId[e.connected_to].name || ET[byId[e.connected_to].type]}${e.port ? `, vrata ${e.port}` : ''}`) : null),
    h('td', { class: 'hide-m' }, e.warranty_until ? h('span', { style: { color: e.warranty_until < todayIso() ? 'var(--muted)' : '' } }, dateSl(e.warranty_until)) : '–'),
    h('td', {}, e.username || '', e.has_password ? h('button', { class: 'btn btn-sm btn-ghost', onclick: async ev => { const r = await get(`/api/equipment/${e.id}/password`); ev.target.replaceWith(h('span', { class: 'pw' }, r.password)); } }, 'geslo') : null),
    h('td', { class: 'actions' }, h('button', { class: 'btn btn-sm', onclick: () => equipmentDialog(s, e) }, 'Uredi'))));
  return h('div', {},
    h('div', { class: 'btn-row', style: { marginBottom: '10px' } },
      h('button', { class: 'btn btn-primary btn-sm', onclick: () => equipmentDialog(s) }, icon('plus', 14), 'Naprava'),
      h('button', { class: 'btn btn-sm', onclick: () => bulkEquipment(s) }, 'Dodaj več kamer naenkrat')),
    s.equipment.length ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Naprava', 'Model', 'IP / MAC', 'Lokacija', 'Garancija', 'Dostop', ''].map((t, i) => h('th', { class: [3, 4].includes(i) ? 'hide-m' : '' }, t)))), h('tbody', {}, rows)))
      : emptyState('Ni opreme', 'Vpišite kamere, snemalnik, diske in omrežno opremo. Podatki se uporabijo v tlorisu, shemi in zapisniku o predaji.'));
}

export function equipmentDialog(s, e = {}) {
  const ET = F.meta.equipment_types;
  const f = h('form', { autocomplete: 'off' },
    h('div', { class: 'form-grid' },
      field('Vrsta', select(Object.entries(ET), e.type || 'camera', { name: 'type' })),
      field('Naziv', h('input', { name: 'name', value: e.name || '', placeholder: 'npr. Kamera dvorišče' })),
      field('Proizvajalec', h('input', { name: 'brand', value: e.brand || '', list: 'brands' })),
      field('Model', h('input', { name: 'model', value: e.model || '' })),
      field('Serijska številka', h('input', { name: 'serial', value: e.serial || '' })),
      field('MAC naslov', h('input', { name: 'mac', value: e.mac || '' })),
      field('IP naslov', h('input', { name: 'ip', value: e.ip || '', inputmode: 'decimal' })),
      field('Firmware', h('input', { name: 'firmware', value: e.firmware || '' })),
      field('Uporabniško ime', h('input', { name: 'username', value: e.username || '', autocomplete: 'off' })),
      field('Geslo (šifrirano)', h('input', { name: 'password', type: 'password', placeholder: e.has_password ? 'shranjeno – vpišite za spremembo' : '', autocomplete: 'new-password' })),
      field('Lokacija', h('input', { name: 'location', value: e.location || '', placeholder: 'npr. Fasada sever, 3 m' })),
      field('Priključeno na', select([['', '–'], ...s.equipment.filter(x => x.id !== e.id).map(x => [x.id, x.name || ET[x.type]])], e.connected_to || '', { name: 'connected_to' })),
      field('Vrata (port)', h('input', { name: 'port', value: e.port || '' })),
      field('Datum vgradnje', h('input', { name: 'installed_at', type: 'date', value: e.installed_at || todayIso() })),
      field('Garancija do', h('input', { name: 'warranty_until', type: 'date', value: e.warranty_until || '' }))),
    h('datalist', { id: 'brands' }, ['Hikvision', 'Dahua', 'Uniview', 'Axis', 'Hanwha', 'Bosch', 'Reolink', 'Ubiquiti', 'TP-Link', 'Mikrotik', 'APC', 'Seagate', 'WD', '2N', 'Ajax', 'Paradox'].map(b => h('option', { value: b }))),
    field('Opombe', h('textarea', { name: 'notes' }, e.notes || '')));
  modal(e.id ? 'Uredi napravo' : 'Nova naprava', f, {
    wide: true,
    actions: [
      e.id ? { label: 'Izbriši', kind: 'btn-danger', onClick: async () => { if (await confirmDialog('Izbrišem napravo?', { danger: true, ok: 'Izbriši' })) { await del(`/api/equipment/${e.id}`); reload(); } } } : null,
      { label: 'Prekliči' },
      { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
        const d = formData(f);
        d.connected_to = d.connected_to ? Number(d.connected_to) : null;
        if (!d.password) delete d.password;
        if (e.id) await put(`/api/equipment/${e.id}`, d); else await post('/api/equipment', { ...d, site_id: s.id });
        toast('Naprava je shranjena'); reload();
      } }].filter(Boolean),
  });
}

function bulkEquipment(s) {
  const n = h('input', { type: 'number', min: 1, max: 64, value: 4 });
  const prefix = h('input', { value: 'Kamera' });
  const brand = h('input', { value: '' });
  const model = h('input', { value: '' });
  const ip = h('input', { placeholder: '192.168.1.64', inputmode: 'decimal' });
  const user = h('input', { value: 'admin', autocomplete: 'off' });
  const pw = h('input', { type: 'password', autocomplete: 'new-password' });
  const nvr = select([['', '–'], ...s.equipment.filter(x => ['nvr', 'switch'].includes(x.type)).map(x => [x.id, x.name || x.type])], '');
  const warranty = h('input', { type: 'date' });
  modal('Dodaj več kamer', h('div', {}, h('p', { class: 'muted' }, 'Kamere se oštevilčijo (Kamera 1, Kamera 2 …). Če vpišete začetni IP, se zadnja številka povečuje.'),
    h('div', { class: 'form-grid' }, field('Število', n), field('Ime (predpona)', prefix), field('Proizvajalec', brand), field('Model', model), field('Začetni IP', ip), field('Priključeno na', nvr), field('Uporabnik', user), field('Geslo', pw), field('Garancija do', warranty))), {
    wide: true,
    actions: [{ label: 'Prekliči' }, { label: 'Dodaj', kind: 'btn-primary', onClick: async () => {
      const count = Math.min(64, Number(n.value) || 1);
      const base = ip.value.split('.');
      const items = Array.from({ length: count }, (_, i) => ({
        site_id: s.id, type: 'camera', name: `${prefix.value} ${i + 1}`, brand: brand.value, model: model.value,
        ip: base.length === 4 ? [...base.slice(0, 3), Number(base[3]) + i].join('.') : null,
        username: user.value, password: pw.value || undefined, connected_to: nvr.value ? Number(nvr.value) : null, port: nvr.value ? String(i + 1) : null,
        installed_at: todayIso(), warranty_until: warranty.value || null,
      }));
      await post('/api/equipment', { items }); toast(`Dodanih ${count} kamer`); reload();
    } }],
  });
}

function filesTab(s) {
  const input = h('input', { type: 'file', accept: 'image/*,application/pdf', multiple: true, hidden: true, onchange: async e => {
    for (const file of e.target.files) {
      const data = await downscale(file);
      await post('/api/files', { site_id: s.id, name: file.name, data });
    }
    toast('Datoteke so naložene'); reload();
  } });
  return h('div', {}, h('div', { class: 'btn-row', style: { marginBottom: '10px' } }, input, h('button', { class: 'btn btn-primary btn-sm', onclick: () => input.click() }, icon('snap', 14), 'Fotografiraj / naloži')),
    s.files.length ? h('div', { class: 'photos' }, s.files.map(f => h('a', { href: `/api/files/${f.id}`, target: '_blank' }, f.mime.startsWith('image/') ? h('img', { src: `/api/files/${f.id}`, alt: f.name, loading: 'lazy' }) : h('span', { style: { padding: '10px', display: 'block' } }, f.name),
      h('button', { class: 'btn-icon', 'aria-label': 'Izbriši', onclick: async ev => { ev.preventDefault(); if (await confirmDialog('Izbrišem datoteko?', { danger: true, ok: 'Izbriši' })) { await del(`/api/files/${f.id}`); reload(); } } }, icon('x', 14)))))
      : emptyState('Ni fotografij', 'Fotografirajte omaro, razvod kablov ali postavitev kamer – pride prav pri naslednjem servisu.'));
}

// Fotografije s telefona zmanjšamo (hitrejši prenos na terenu)
export function downscale(file, max = 1920) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return resolve(fr.result);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(fr.result);
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

function handoverDialog(s) {
  const pw = toggle(false, 'Vključi uporabniška imena in gesla naprav');
  modal('Zapisnik o predaji sistema', h('div', {}, h('p', {}, 'Zapisnik vsebuje seznam vgrajene opreme, izjavo o predaji in prostor za podpis.'), pw), {
    actions: [{ label: 'Prekliči' }, { label: 'Odpri za tisk', kind: 'btn-primary', onClick: () => { window.open(`/print/site/${s.id}/handover${pw.input.checked ? '?passwords=1' : ''}`, '_blank'); } }],
  });
}
function noticeDialog(s) {
  const controller = h('input', { value: s.customer?.name || '' });
  const contact = h('input', { value: [s.customer?.phone, s.customer?.email].filter(Boolean).join(', ') });
  const purpose = h('input', { value: 'varovanje ljudi in premoženja' });
  const retention = h('input', { value: '30 dni' });
  modal('Obvestilo o videonadzoru', h('div', {}, h('p', { class: 'muted' }, 'Obvestilo za namestitev pred vstopom v nadzorovano območje (ZVOP-2).'),
    field('Upravljavec', controller), field('Kontakt za uveljavljanje pravic', contact), field('Namen', purpose), field('Rok hrambe posnetkov', retention)), {
    actions: [{ label: 'Prekliči' }, { label: 'Odpri za tisk', kind: 'btn-primary', onClick: () => { window.open(`/print/site/${s.id}/notice?${new URLSearchParams({ controller: controller.value, contact: contact.value, purpose: purpose.value, retention: retention.value })}`, '_blank'); } }],
  });
}

boot().catch(e => { document.body.textContent = `Napaka pri zagonu: ${e.message}`; });
