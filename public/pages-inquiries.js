// VisionOne Field – povpraševanja s spletne strani visionone.si
import { h, clear, icon, get, put, del, toast, confirmDialog, emptyState } from './lib/core.js';
import { head, reload, customerDialog } from './app.js';

export const TOPICS = { cctv: 'Videonadzor', alarm: 'Alarm', pozar: 'Požarna signalizacija', domofon: 'Domofonija', mreza: 'Omrežje / Wi-Fi', servis: 'Servis', portal: 'VisionOne portal', anketa: 'Anonimna anketa', razvoj: 'Programska rešitev po meri', general: 'Splošno' };
const STATUS = { new: ['Novo', 'info'], open: ['V obdelavi', 'warn'], done: ['Zaključeno', 'ok'], spam: ['Neželeno', 'err'] };
const when = ts => new Date(ts * 1000).toLocaleString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export async function pageInquiries(page, filter = 'active') {
  const all = await get('/api/inquiries?status=all');
  const rows = all.filter(r => (filter === 'active' ? ['new', 'open'].includes(r.status) : filter === 'all' ? r.status !== 'spam' : r.status === filter));
  const tabs = [['active', 'Odprta'], ['done', 'Zaključena'], ['all', 'Vsa'], ['spam', 'Neželena']];
  const setStatus = async (r, status) => { await put(`/api/inquiries/${r.id}`, { status }); toast(STATUS[status][0]); reload(); };
  const toCustomer = r => customerDialog({
    type: r.company ? 'company' : 'person', name: r.company || r.name, email: r.email || '', phone: r.phone || '',
    contacts_json: JSON.stringify(r.company ? [{ name: r.name, phone: r.phone || '', email: r.email || '' }] : []),
    notes: `Povpraševanje s spletne strani (${when(r.created_at)}):\n${r.message}`,
  }, async id => { await put(`/api/inquiries/${r.id}`, { customer_id: id, status: 'open' }); });

  const card = r => h('div', { class: 'panel', style: { marginBottom: '12px' } },
    h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '10px' } },
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('strong', { style: { fontSize: '16px' } }, r.name), r.company ? h('span', { class: 'muted' }, ` · ${r.company}`) : null,
        h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '2px' } }, [TOPICS[r.topic] || r.topic, when(r.created_at), r.site_type, r.devices ? `${r.devices} naprav` : null, r.timeline].filter(Boolean).join(' · '))),
      h('span', { class: `badge ${STATUS[r.status]?.[1] || ''}` }, STATUS[r.status]?.[0] || r.status)),
    h('p', { style: { whiteSpace: 'pre-wrap', margin: '10px 0' } }, r.message),
    h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } },
      r.phone ? h('a', { class: 'btn btn-sm', href: `tel:${r.phone.replace(/\s/g, '')}` }, icon('bell', 14), r.phone) : null,
      r.email ? h('a', { class: 'btn btn-sm', href: `mailto:${r.email}?subject=${encodeURIComponent('Vaše povpraševanje – VisionOne')}` }, icon('link', 14), r.email) : null,
      r.customer_id ? h('a', { class: 'btn btn-sm', href: `#/stranka/${r.customer_id}` }, icon('users', 14), r.customer_name || 'Stranka')
        : h('button', { class: 'btn btn-sm btn-primary', onclick: () => toCustomer(r) }, icon('plus', 14), 'Ustvari stranko'),
      h('span', { class: 'spacer', style: { flex: 1 } }),
      r.status !== 'done' ? h('button', { class: 'btn btn-sm', onclick: () => setStatus(r, 'done') }, icon('check', 14), 'Zaključi') : h('button', { class: 'btn btn-sm', onclick: () => setStatus(r, 'open') }, 'Ponovno odpri'),
      r.status !== 'spam' ? h('button', { class: 'btn btn-sm btn-ghost', onclick: () => setStatus(r, 'spam') }, 'Neželeno') : null,
      h('button', { class: 'btn-icon', title: 'Izbriši', onclick: async () => { if (await confirmDialog('Izbrišem povpraševanje?', { danger: true, ok: 'Izbriši' })) { await del(`/api/inquiries/${r.id}`); reload(); } } }, icon('trash', 16))));

  clear(page,
    head('Povpraševanja', 'Sporočila s kontaktnega obrazca na visionone.si.'),
    h('div', { class: 'row', style: { gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } }, tabs.map(([k, l]) =>
      h('a', { class: `btn btn-sm ${k === filter ? 'btn-primary' : ''}`, href: `#/povprasevanja${k === 'active' ? '' : `/${k}`}` }, l))),
    rows.length ? h('div', {}, rows.map(card)) : emptyState('Ni povpraševanj', filter === 'active' ? 'Ko nekdo izpolni obrazec na visionone.si, se prikaže tukaj.' : ''));
}
