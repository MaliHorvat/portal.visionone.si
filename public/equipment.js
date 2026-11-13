// VisionOne portal – oprema pri stranki: kamere, snemalniki, diski, stikala, usmerjevalniki …
// Splošni podatki (IP, MAC, geslo …) so v svojih stolpcih, podatki, odvisni od vrste naprave, v polju specs (JSON).
import { h, icon, get, post, put, del, toast, modal, confirmDialog, field, select, formData, emptyState } from './lib/core.js';
import { F, dateSl, todayIso, reload } from './app.js';

const BRANDS = ['Hikvision', 'Dahua', 'Uniview', 'Hanwha', 'Axis', 'Bosch', 'Reolink', 'Ezviz', 'Imou', 'Ubiquiti', 'TP-Link', 'Mikrotik', 'Cisco', 'Zyxel', 'APC', 'Eaton', 'Seagate', 'WD', 'Toshiba', '2N', 'Comelit', 'Akuvox', 'Ajax', 'Paradox', 'Satel', 'Jablotron', 'Bentel'];
const sel = opts => opts.map(o => (Array.isArray(o) ? o : [o, o]));

// [ključ, napis, vrsta ('text' | 'number' | 'date' | 'textarea' | [možnosti]), namig]
const GATEWAY = ['gateway', 'Prehod (gateway)', 'text', 'npr. 192.168.1.1'];
export const SPEC_FIELDS = {
  camera: [
    ['shape', 'Oblika', sel(['', 'Dome', 'Turret', 'Bullet', 'PTZ', 'Fisheye', 'Mini / kocka', 'Box'])],
    ['resolution', 'Ločljivost', sel(['', '2 MP', '4 MP', '5 MP', '6 MP', '8 MP (4K)', '12 MP'])],
    ['lens', 'Objektiv', 'text', 'npr. 2,8 mm ali 2,8–12 mm'],
    ['ir_range', 'Nočni doseg (m)', 'number'],
    ['channel', 'Kanal na snemalniku', 'number'],
    ['power', 'Napajanje', sel(['', 'PoE', '12 V DC', '24 V AC', 'PoE+'])],
    ['audio', 'Zvok', sel(['', 'Brez', 'Mikrofon', 'Dvosmerni zvok'])],
    ['rtsp_port', 'RTSP vrata', 'number', '554'],
    GATEWAY,
  ],
  nvr: [
    ['kind', 'Vrsta', sel(['', 'NVR', 'DVR', 'XVR / hibridni'])],
    ['channels', 'Število kanalov', sel(['', '4', '8', '16', '32', '64'])],
    ['poe_ports', 'PoE vrat', 'number'],
    ['hdd_bays', 'Rež za diske', 'number'],
    ['storage', 'Diski skupaj', 'text', 'npr. 2× 4 TB'],
    ['retention', 'Hramba posnetkov (dni)', 'number'],
    ['p2p', 'P2P / oblak ID', 'text', 'npr. Hik-Connect ali DMSS serijska'],
    ['http_port', 'HTTP vrata', 'number', '80'],
    ['rtsp_port', 'RTSP vrata', 'number', '554'],
    GATEWAY,
  ],
  disk: [
    ['capacity', 'Kapaciteta', sel(['', '1 TB', '2 TB', '3 TB', '4 TB', '6 TB', '8 TB', '10 TB', '12 TB', '16 TB', '20 TB'])],
    ['disk_kind', 'Vrsta', sel(['', 'HDD za videonadzor', 'HDD', 'SSD'])],
    ['bay', 'Reža v snemalniku', 'number'],
  ],
  switch: [
    ['ports', 'Število vrat', 'number'],
    ['poe_ports', 'PoE vrat', 'number'],
    ['poe_budget', 'PoE moč (W)', 'number'],
    ['managed', 'Upravljanje', sel(['', 'Neupravljano', 'Upravljano', 'Pametno (smart)'])],
    ['vlan', 'VLAN', 'text', 'npr. 10 kamere, 20 pisarna'],
    ['uplink', 'Povezava navzgor', 'text', 'npr. vrata 9 → usmerjevalnik'],
    GATEWAY,
  ],
  router: [
    ['wan_ip', 'Javni IP (WAN)', 'text'],
    ['isp', 'Ponudnik interneta', 'text', 'npr. Telekom, A1, T-2'],
    ['ddns', 'DDNS naslov', 'text'],
    ['lan', 'Lokalno omrežje', 'text', 'npr. 192.168.1.0/24'],
    ['dhcp', 'DHCP obseg', 'text', 'npr. .100–.200'],
    ['forwards', 'Preusmeritve vrat', 'textarea', 'npr. 8000 → snemalnik'],
  ],
  ap: [
    ['ssid', 'SSID (ime omrežja)', 'text'],
    ['band', 'Frekvenca', sel(['', '2,4 GHz', '5 GHz', '2,4 + 5 GHz', 'Wi-Fi 6E (6 GHz)'])],
    ['guest', 'Omrežje za goste', 'text'],
    ['controller', 'Upravljanje', 'text', 'npr. UniFi, Omada'],
    GATEWAY,
  ],
  ups: [
    ['power_va', 'Moč (VA)', 'number'],
    ['runtime', 'Avtonomija (min)', 'number'],
    ['battery_date', 'Zadnja menjava baterije', 'date'],
  ],
  intercom: [
    ['unit_kind', 'Enota', sel(['', 'Zunanja enota', 'Notranja enota', 'Napajalnik / razdelilnik'])],
    ['buttons', 'Število tipk / stanovanj', 'number'],
    ['sip', 'SIP / klicna številka', 'text'],
    ['app', 'Aplikacija', 'text', 'npr. Hik-Connect, My2N'],
    GATEWAY,
  ],
  alarm: [
    ['zones', 'Število con', 'number'],
    ['communicator', 'Komunikator', sel(['', 'LAN', 'GSM / 4G', 'LAN + GSM', 'Wi-Fi'])],
    ['monitoring', 'Varnostno-nadzorni center', 'text'],
    ['app', 'Aplikacija', 'text', 'npr. Ajax, Paradox Insite'],
    GATEWAY,
  ],
  sensor: [
    ['sensor_kind', 'Vrsta', sel(['', 'PIR (gibanje)', 'Magnetni kontakt', 'Dim', 'Toplota', 'Lom stekla', 'Poplava', 'Sirena', 'Tipkovnica', 'Ročni javljalnik'])],
    ['zone', 'Cona', 'text'],
    ['wireless', 'Povezava', sel(['', 'Žični', 'Brezžični'])],
  ],
  access: [
    ['reader', 'Čitalec', sel(['', 'Kartica / obesek', 'PIN', 'Prstni odtis', 'Obraz', 'QR koda'])],
    ['doors', 'Število vrat', 'number'],
    ['lock', 'Ključavnica', 'text', 'npr. elektromagnetna, prijemalo'],
    GATEWAY,
  ],
  monitor: [
    ['size', 'Velikost (palcev)', 'number'],
    ['input', 'Vhod', sel(['', 'HDMI', 'VGA', 'HDMI + VGA', 'BNC'])],
  ],
  other: [],
};

const parseSpecs = e => { try { return e.specs ? JSON.parse(e.specs) : {}; } catch { return {}; } };

/** Kratek povzetek tehničnih podatkov za tabelo (npr. »Dome · 4 MP · 2,8 mm · kanal 3«). */
export function specSummary(e) {
  const s = parseSpecs(e);
  const parts = {
    camera: [s.shape, s.resolution, s.lens, s.ir_range && `IR ${s.ir_range} m`, s.channel && `kanal ${s.channel}`],
    nvr: [s.kind, s.channels && `${s.channels} kanalov`, s.storage, s.retention && `${s.retention} dni`],
    disk: [s.capacity, s.disk_kind, s.bay && `reža ${s.bay}`],
    switch: [s.ports && `${s.ports} vrat`, s.poe_ports && `${s.poe_ports}× PoE`, s.poe_budget && `${s.poe_budget} W`, s.managed],
    router: [s.isp, s.wan_ip && `WAN ${s.wan_ip}`, s.lan],
    ap: [s.ssid && `SSID ${s.ssid}`, s.band],
    ups: [s.power_va && `${s.power_va} VA`, s.battery_date && `baterija ${dateSl(s.battery_date)}`],
    intercom: [s.unit_kind, s.buttons && `${s.buttons} tipk`],
    alarm: [s.zones && `${s.zones} con`, s.communicator],
    sensor: [s.sensor_kind, s.zone && `cona ${s.zone}`],
    access: [s.reader, s.doors && `${s.doors} vrat`],
    monitor: [s.size && `${s.size}"`, s.input],
  }[e.type] || [];
  return parts.filter(Boolean).join(' · ');
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const MAC = /^[0-9a-f]{2}([-:]?)[0-9a-f]{2}(\1[0-9a-f]{2}){4}$/i;
const normMac = m => (m || '').replace(/[^0-9a-f]/gi, '').toUpperCase().replace(/(..)(?!$)/g, '$1:');

/**
 * Obrazec za napravo.
 * ctx: { sites: [{ id, name }], siteId, equipment: [...] } – vsa oprema stranke ali objekta (za »priključeno na« in podvojene IP).
 */
export function equipmentDialog(ctx, e = {}) {
  const ET = F.meta.equipment_types;
  const specs = parseSpecs(e);
  const typeSel = select(Object.entries(ET), e.type || 'camera', { name: 'type' });
  const siteSel = ctx.sites.length > 1 ? select(ctx.sites.map(s => [s.id, s.name]), e.site_id || ctx.siteId || ctx.sites[0].id, { name: 'site_id' }) : null;
  const siteId = () => Number(siteSel ? siteSel.value : ctx.siteId || ctx.sites[0]?.id);
  const connSel = select([['', '–']], '', { name: 'connected_to' });
  const fillConn = () => {
    const opts = ctx.equipment.filter(x => x.id !== e.id && x.site_id === siteId() && ['nvr', 'switch', 'router', 'ups', 'alarm', 'ap'].includes(x.type));
    connSel.replaceChildren(h('option', { value: '' }, '–'), ...opts.map(x => h('option', { value: x.id, selected: x.id === e.connected_to }, `${x.name || ET[x.type]}${x.ip ? ` (${x.ip})` : ''}`)));
  };
  fillConn();
  siteSel?.addEventListener('change', fillConn);

  const ip = h('input', { name: 'ip', value: e.ip || '', inputmode: 'decimal', placeholder: '192.168.1.64', autocomplete: 'off', spellcheck: false });
  const mac = h('input', { name: 'mac', value: e.mac || '', placeholder: 'AA:BB:CC:DD:EE:FF', autocomplete: 'off', spellcheck: false });
  const ipHint = h('small', { class: 'hint' });
  const macHint = h('small', { class: 'hint' });
  const checkIp = () => {
    const v = ip.value.trim();
    let msg = '';
    if (v && !IPV4.test(v)) msg = 'IP naslov ni v obliki 192.168.1.64.';
    else if (v) { const dup = ctx.equipment.find(x => x.id !== e.id && x.ip === v && x.site_id === siteId()); if (dup) msg = `Ta IP že ima: ${dup.name || ET[dup.type]}.`; }
    ipHint.textContent = msg; ipHint.classList.toggle('warn-text', !!msg);
  };
  const checkMac = () => { const v = mac.value.trim(); const bad = v && !MAC.test(v); macHint.textContent = bad ? 'MAC naslov ima 12 šestnajstiških znakov.' : ''; macHint.classList.toggle('warn-text', !!bad); };
  ip.addEventListener('input', checkIp); mac.addEventListener('input', checkMac);
  mac.addEventListener('blur', () => { if (MAC.test(mac.value.trim())) mac.value = normMac(mac.value); });

  const specBox = h('div', { class: 'form-grid' });
  const specInputs = {};
  const renderSpecs = () => {
    // vrednosti, ki jih je uporabnik že vpisal, ohranimo tudi ob menjavi vrste
    for (const [k, inp] of Object.entries(specInputs)) if (inp.value) specs[k] = inp.value;
    for (const k of Object.keys(specInputs)) delete specInputs[k];
    const defs = SPEC_FIELDS[typeSel.value] || [];
    specBox.replaceChildren(...defs.map(([k, label, kind, ph]) => {
      let inp;
      if (Array.isArray(kind)) inp = select(kind, specs[k] || '');
      else if (kind === 'textarea') inp = h('textarea', { rows: 2, placeholder: ph || '' }, specs[k] || '');
      else inp = h('input', { type: kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text', value: specs[k] || '', placeholder: ph || '', min: kind === 'number' ? 0 : null, inputmode: kind === 'number' ? 'numeric' : null });
      specInputs[k] = inp;
      return h('div', { class: kind === 'textarea' ? 'span-2' : '' }, field(label, inp));
    }));
    specTitle.hidden = !defs.length;
  };
  const specTitle = h('h3', { class: 'eq-sec' }, 'Tehnični podatki');
  typeSel.addEventListener('change', renderSpecs);

  const f = h('form', { autocomplete: 'off', onsubmit: ev => ev.preventDefault() },
    h('div', { class: 'form-grid' },
      field('Vrsta', typeSel),
      field('Naziv', h('input', { name: 'name', value: e.name || '', placeholder: 'npr. Kamera dvorišče' })),
      siteSel ? field('Objekt', siteSel) : null,
      field('Proizvajalec', h('input', { name: 'brand', value: e.brand || '', list: 'eq-brands' })),
      field('Model', h('input', { name: 'model', value: e.model || '', placeholder: 'npr. DS-2CD2143G2-I' })),
      field('Serijska številka', h('input', { name: 'serial', value: e.serial || '', spellcheck: false }))),
    h('h3', { class: 'eq-sec' }, 'Omrežje in dostop'),
    h('div', { class: 'form-grid' },
      h('div', { class: 'field' }, h('label', { for: 'eq-ip' }, 'IP naslov'), Object.assign(ip, { id: 'eq-ip' }), ipHint),
      h('div', { class: 'field' }, h('label', { for: 'eq-mac' }, 'MAC naslov'), Object.assign(mac, { id: 'eq-mac' }), macHint),
      field('Uporabniško ime', h('input', { name: 'username', value: e.username || '', autocomplete: 'off' })),
      field('Geslo (shranjeno šifrirano)', h('input', { name: 'password', type: 'password', placeholder: e.has_password ? 'shranjeno – vpišite za spremembo' : '', autocomplete: 'new-password' })),
      field('Firmware', h('input', { name: 'firmware', value: e.firmware || '' })),
      field('Priključeno na', connSel),
      field('Vrata (port) na stikalu/snemalniku', h('input', { name: 'port', value: e.port || '' }))),
    specTitle, specBox,
    h('h3', { class: 'eq-sec' }, 'Namestitev'),
    h('div', { class: 'form-grid' },
      field('Lokacija', h('input', { name: 'location', value: e.location || '', placeholder: 'npr. Fasada sever, 3 m' })),
      field('Datum vgradnje', h('input', { name: 'installed_at', type: 'date', value: e.installed_at || todayIso() })),
      field('Garancija do', h('input', { name: 'warranty_until', type: 'date', value: e.warranty_until || '' }))),
    h('datalist', { id: 'eq-brands' }, BRANDS.map(b => h('option', { value: b }))),
    field('Opombe', h('textarea', { name: 'notes' }, e.notes || '')));
  renderSpecs(); checkIp(); checkMac();

  modal(e.id ? 'Uredi napravo' : 'Nova naprava', f, {
    wide: true,
    actions: [
      e.id ? { label: 'Izbriši', kind: 'btn-danger', onClick: async () => { if (await confirmDialog('Izbrišem napravo?', { danger: true, ok: 'Izbriši' })) { await del(`/api/equipment/${e.id}`); toast('Naprava je izbrisana'); reload(); } else return false; } } : null,
      e.id ? { label: 'Podvoji', onClick: () => { const copy = { ...e, ...collect(), id: undefined, name: '', ip: '', mac: '', serial: '', has_password: false }; setTimeout(() => equipmentDialog(ctx, copy), 50); } } : null,
      { label: 'Prekliči' },
      { label: 'Shrani', kind: 'btn-primary', onClick: async () => {
        const d = collect();
        if (d.ip && !IPV4.test(d.ip)) throw new Error('IP naslov ni pravilen (npr. 192.168.1.64).');
        if (!d.password) delete d.password;
        if (e.id) await put(`/api/equipment/${e.id}`, d); else await post('/api/equipment', d);
        toast('Naprava je shranjena'); reload();
      } }].filter(Boolean),
  });

  function collect() {
    const d = formData(f);
    d.ip = ip.value.trim(); d.mac = MAC.test(mac.value.trim()) ? normMac(mac.value) : mac.value.trim();
    d.site_id = siteId();
    d.connected_to = connSel.value ? Number(connSel.value) : null;
    const sp = {};
    for (const [k, inp] of Object.entries(specInputs)) if (inp.value !== '') sp[k] = inp.value;
    d.specs = Object.keys(sp).length ? JSON.stringify(sp) : null;
    return d;
  }
}

/** Več kamer naenkrat z naraščajočim IP in kanalom. */
export function bulkEquipment(ctx) {
  const n = h('input', { type: 'number', min: 1, max: 64, value: 4 });
  const prefix = h('input', { value: 'Kamera' });
  const brand = h('input', { value: '', list: 'eq-brands2' });
  const model = h('input', { value: '' });
  const ip = h('input', { placeholder: '192.168.1.64', inputmode: 'decimal' });
  const user = h('input', { value: 'admin', autocomplete: 'off' });
  const pw = h('input', { type: 'password', autocomplete: 'new-password' });
  const shape = select(SPEC_FIELDS.camera[0][2], '');
  const res = select(SPEC_FIELDS.camera[1][2], '');
  const lens = h('input', { placeholder: '2,8 mm' });
  const siteSel = ctx.sites.length > 1 ? select(ctx.sites.map(s => [s.id, s.name]), ctx.siteId || ctx.sites[0].id) : null;
  const siteId = () => Number(siteSel ? siteSel.value : ctx.siteId || ctx.sites[0]?.id);
  const nvr = select([['', '–']], '');
  const fillNvr = () => nvr.replaceChildren(h('option', { value: '' }, '–'), ...ctx.equipment.filter(x => x.site_id === siteId() && ['nvr', 'switch'].includes(x.type)).map(x => h('option', { value: x.id }, x.name || x.type)));
  fillNvr(); siteSel?.addEventListener('change', fillNvr);
  const warranty = h('input', { type: 'date' });
  modal('Dodaj več kamer', h('div', {}, h('p', { class: 'muted' }, 'Kamere se oštevilčijo (Kamera 1, Kamera 2 …). Če vpišete začetni IP, se zadnja številka povečuje; kanal na snemalniku sledi zaporedni številki.'),
    h('div', { class: 'form-grid' }, siteSel ? field('Objekt', siteSel) : null, field('Število', n), field('Ime (predpona)', prefix), field('Proizvajalec', brand), field('Model', model),
      field('Oblika', shape), field('Ločljivost', res), field('Objektiv', lens),
      field('Začetni IP', ip), field('Priključeno na', nvr), field('Uporabnik', user), field('Geslo', pw), field('Garancija do', warranty)),
    h('datalist', { id: 'eq-brands2' }, BRANDS.map(b => h('option', { value: b })))), {
    wide: true,
    actions: [{ label: 'Prekliči' }, { label: 'Dodaj', kind: 'btn-primary', onClick: async () => {
      const count = Math.min(64, Number(n.value) || 1);
      const base = ip.value.trim().split('.');
      if (ip.value.trim() && !IPV4.test(ip.value.trim())) throw new Error('Začetni IP ni pravilen.');
      if (base.length === 4 && Number(base[3]) + count - 1 > 254) throw new Error('IP naslovi bi presegli .254 – izberite nižji začetni IP.');
      const items = Array.from({ length: count }, (_, i) => {
        const sp = { shape: shape.value, resolution: res.value, lens: lens.value.trim(), channel: nvr.value ? String(i + 1) : '' };
        Object.keys(sp).forEach(k => !sp[k] && delete sp[k]);
        return {
          site_id: siteId(), type: 'camera', name: `${prefix.value} ${i + 1}`, brand: brand.value, model: model.value,
          ip: base.length === 4 ? [...base.slice(0, 3), Number(base[3]) + i].join('.') : null,
          username: user.value, password: pw.value || undefined, connected_to: nvr.value ? Number(nvr.value) : null, port: nvr.value ? String(i + 1) : null,
          installed_at: todayIso(), warranty_until: warranty.value || null, specs: Object.keys(sp).length ? JSON.stringify(sp) : null,
        };
      });
      await post('/api/equipment', { items }); toast(`Dodanih ${count} kamer`); reload();
    } }],
  });
}

/** Tabela opreme; pri stranki je razdeljena po objektih. */
export function equipmentTable(ctx, list, { bySite = false } = {}) {
  const ET = F.meta.equipment_types;
  const byId = Object.fromEntries(ctx.equipment.map(e => [e.id, e]));
  const row = e => h('tr', { class: 'eq-row' },
    h('td', {}, h('strong', {}, e.name || ET[e.type]), h('div', { class: 'eq-type' }, ET[e.type])),
    h('td', {}, [e.brand, e.model].filter(Boolean).join(' ') || (specSummary(e) ? null : '–'), specSummary(e) ? h('div', { class: 'eq-type' }, specSummary(e)) : null, e.serial ? h('div', { class: 'eq-type hide-m' }, `S/N ${e.serial}`) : null),
    h('td', { class: 'mono' }, e.ip ? h('a', { href: `http://${e.ip}`, target: '_blank', rel: 'noopener', title: 'Odpri spletni vmesnik (v lokalnem omrežju)' }, e.ip) : '–',
      e.ip ? h('button', { class: 'btn-icon eq-copy', title: 'Kopiraj IP', 'aria-label': 'Kopiraj IP', onclick: () => navigator.clipboard?.writeText(e.ip).then(() => toast('IP je kopiran')) }, icon('copy', 14)) : null,
      e.mac ? h('div', { class: 'eq-type' }, e.mac) : null),
    h('td', { class: 'hide-m' }, e.location || '–', e.connected_to && byId[e.connected_to] ? h('div', { class: 'eq-type' }, `→ ${byId[e.connected_to].name || ET[byId[e.connected_to].type]}${e.port ? `, vrata ${e.port}` : ''}`) : null),
    h('td', { class: 'hide-m' }, e.warranty_until ? h('span', { style: { color: e.warranty_until < todayIso() ? 'var(--muted)' : '' } }, dateSl(e.warranty_until)) : '–'),
    h('td', {}, e.username || '', e.has_password ? h('button', { class: 'btn btn-sm btn-ghost', onclick: async ev => { const r = await get(`/api/equipment/${e.id}/password`); ev.target.replaceWith(h('span', { class: 'pw' }, r.password)); } }, 'geslo') : null),
    h('td', { class: 'actions' }, h('button', { class: 'btn btn-sm', onclick: () => equipmentDialog(ctx, e) }, 'Uredi')));
  const heads = ['Naprava', 'Model in podatki', 'IP / MAC', 'Lokacija', 'Garancija', 'Dostop', ''];
  let body;
  if (bySite) {
    body = ctx.sites.flatMap(s => {
      const items = list.filter(e => e.site_id === s.id);
      if (!items.length) return [];
      return [h('tr', { class: 'eq-group' }, h('td', { colspan: 7 }, h('a', { href: `#/objekt/${s.id}` }, s.name), h('span', { class: 'muted' }, ` · ${items.length}`))), ...items.map(row)];
    });
  } else body = list.map(row);
  return h('div', { class: 'table-wrap' }, h('table', { class: 'eq-table' }, h('thead', {}, h('tr', {}, heads.map((t, i) => h('th', { class: [3, 4].includes(i) ? 'hide-m' : '' }, t)))), h('tbody', {}, body)));
}

/** Povzetek po vrstah: »6 kamer · 1 snemalnik · 1 stikalo«. */
export function equipmentCounts(list) {
  const ET = F.meta.equipment_types;
  const n = {};
  for (const e of list) n[e.type] = (n[e.type] || 0) + 1;
  return Object.entries(n).map(([t, c]) => `${c}× ${ET[t] || t}`).join(' · ');
}

/** Razdelek »Oprema« na strani stranke. */
export function customerEquipment(c) {
  const sites = c.sites.map(s => ({ id: s.id, name: s.name }));
  const ctx = { sites, siteId: sites[0]?.id, equipment: c.equipment };
  const ensureSite = async () => {
    if (sites.length) return true;
    const r = await post('/api/sites', { customer_id: c.id, name: c.type === 'person' ? 'Dom' : 'Sedež', address: c.address, post: c.post, city: c.city, maintenance_months: 12 });
    sites.push({ id: r.id, name: c.type === 'person' ? 'Dom' : 'Sedež' }); ctx.siteId = r.id;
    return true;
  };
  const search = h('input', { type: 'search', placeholder: 'Išči po imenu, IP, MAC, modelu …', class: 'eq-search' });
  const tableBox = h('div', {});
  const render = () => {
    const qv = search.value.trim().toLowerCase();
    const list = qv ? c.equipment.filter(e => [e.name, e.ip, e.mac, e.model, e.brand, e.serial, e.location, specSummary(e)].some(v => (v || '').toLowerCase().includes(qv))) : c.equipment;
    tableBox.replaceChildren(list.length ? equipmentTable(ctx, list, { bySite: sites.length > 1 }) : h('p', { class: 'muted', style: { padding: '14px', margin: 0 } }, 'Nobena naprava ne ustreza iskanju.'));
  };
  search.addEventListener('input', render);
  render();
  return h('div', {},
    h('div', { class: 'section-title' }, h('h2', {}, 'Oprema'), c.equipment.length ? h('span', { class: 'badge plain' }, c.equipment.length) : null, h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-sm', onclick: async () => { await ensureSite(); bulkEquipment(ctx); } }, 'Več kamer'),
      h('button', { class: 'btn btn-sm btn-primary', onclick: async () => { await ensureSite(); equipmentDialog(ctx); } }, icon('plus', 14), 'Naprava')),
    c.equipment.length
      ? h('div', {}, h('div', { class: 'eq-toolbar' }, h('span', { class: 'muted' }, equipmentCounts(c.equipment)), c.equipment.length > 6 ? search : null), tableBox)
      : h('div', { class: 'panel' }, emptyState('Ni vpisane opreme', 'Dodajte kamere, snemalnik, diske, stikala in usmerjevalnik z IP naslovi in dostopnimi podatki. Gesla se shranijo šifrirano.')));
}
