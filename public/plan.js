// VisionOne Field – tloris z vidnimi koti kamer in samodejna omrežna shema
import { h, clear, icon, get, post, put, del, toast, toastErr, modal, confirmDialog, field, select, emptyState, debounce } from './lib/core.js';
import { F } from './app.js';
import { downscale } from './app.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const SHORT = { camera: 'K', nvr: 'N', disk: 'D', switch: 'S', router: 'R', ups: 'U', intercom: 'I', alarm: 'A', sensor: 'J', access: 'P', monitor: 'M', ap: 'W', other: '•' };
const COLOR = { camera: '#0f766e', nvr: '#1f6fe0', switch: '#7c3aed', router: '#7c3aed', ups: '#b7791f', intercom: '#c2410c', alarm: '#c8372d', sensor: '#c8372d', access: '#c2410c', ap: '#7c3aed' };

async function uploadPlan(site, done) {
  const name = h('input', { value: 'Pritličje' });
  const file = h('input', { type: 'file', accept: 'image/*' });
  modal('Nov tloris', h('div', {}, h('p', { class: 'muted' }, 'Naložite sliko tlorisa (izvoz iz načrta, skeniran načrt ali fotografija skice).'), field('Ime', name), field('Slika', file)), {
    actions: [{ label: 'Prekliči' }, { label: 'Naloži', kind: 'btn-primary', onClick: async () => {
      const f = file.files[0]; if (!f) throw new Error('Izberite sliko');
      await post('/api/plans', { site_id: site.id, name: name.value, image: await downscale(f, 2600) });
      toast('Tloris je dodan'); done();
    } }],
  });
}

export function planEditor(site, reload) {
  const root = h('div');
  if (!site.plans.length) {
    root.append(emptyState('Ni tlorisa', 'Naložite tloris in nanj razporedite kamere ter drugo opremo. Za kamere nastavite smer in vidni kot – tako vidite pokritost in morebitne slepe pege.',
      h('button', { class: 'btn btn-primary', onclick: () => uploadPlan(site, reload) }, 'Naloži tloris')));
    return root;
  }
  let plan = site.plans[0];
  let selected = null, placing = null;
  const eq = site.equipment;
  const img = h('img', { alt: 'Tloris' });
  const svg = S('svg', { preserveAspectRatio: 'none' });
  const stage = h('div', { class: 'plan-stage' }, img, svg);
  const side = h('div');
  let W = 1000, H = 700;
  const save = debounce(e => put(`/api/equipment/${e.id}`, { plan_id: e.plan_id, plan_x: e.plan_x, plan_y: e.plan_y, dir: e.dir, fov: e.fov, range: e.range }).catch(toastErr), 350);
  const rel = ev => { const r = svg.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; };

  function draw() {
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const on = eq.filter(e => e.plan_id === plan.id && e.plan_x != null);
    // najprej vidni koti, da so oznake na vrhu
    for (const e of on.filter(x => x.type === 'camera')) {
      const cx = e.plan_x * W, cy = e.plan_y * H, r = (e.range ?? 0.15) * W, fov = Math.min(360, e.fov ?? 90), dir = e.dir ?? 0;
      let d;
      if (fov >= 359) d = `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
      else {
        const a1 = (dir - fov / 2) * Math.PI / 180, a2 = (dir + fov / 2) * Math.PI / 180;
        d = `M ${cx} ${cy} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${fov > 180 ? 1 : 0} 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`;
      }
      svg.append(S('path', { d, fill: selected === e ? 'rgba(15,118,110,.32)' : 'rgba(15,118,110,.18)', stroke: 'rgba(15,118,110,.7)', 'stroke-width': 1.5 }));
    }
    on.forEach((e, i) => {
      const cx = e.plan_x * W, cy = e.plan_y * H;
      const g = S('g', { style: 'cursor:grab' });
      g.append(S('circle', { cx, cy, r: selected === e ? 15 : 12, fill: COLOR[e.type] || '#475569', stroke: '#fff', 'stroke-width': 3 }));
      const t = S('text', { x: cx, y: cy + 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff' }); t.textContent = SHORT[e.type] || '•';
      const lb = S('text', { x: cx + 17, y: cy - 10, 'font-size': 13, fill: '#111', stroke: '#fff', 'stroke-width': 3.5, 'paint-order': 'stroke' }); lb.textContent = e.name || F.meta.equipment_types[e.type];
      g.append(t, lb);
      let drag = false;
      g.addEventListener('pointerdown', ev => { ev.stopPropagation(); selected = e; drag = true; g.setPointerCapture?.(ev.pointerId); renderSide(); draw(); });
      g.addEventListener('pointermove', ev => { if (!drag) return; const [x, y] = rel(ev); e.plan_x = Math.max(0, Math.min(1, x)); e.plan_y = Math.max(0, Math.min(1, y)); draw(); });
      g.addEventListener('pointerup', () => { if (drag) { drag = false; save(e); } });
      svg.append(g);
    });
  }
  svg.addEventListener('pointerdown', ev => {
    if (placing) {
      const [x, y] = rel(ev);
      Object.assign(placing, { plan_id: plan.id, plan_x: x, plan_y: y, dir: placing.dir ?? 0, fov: placing.fov ?? 90, range: placing.range ?? 0.15 });
      save(placing); selected = placing; placing = null; stage.classList.remove('placing'); renderSide(); draw();
    } else if (ev.target === svg) { selected = null; renderSide(); draw(); }
  });

  function slider(label, key, min, max, step, unit) {
    const out = h('span', { class: 'muted' }, `${selected[key]}${unit}`);
    return h('div', { class: 'field' }, h('label', {}, label, ' ', out), h('input', { type: 'range', min, max, step, value: selected[key] ?? min, oninput: e => { selected[key] = Number(e.target.value); out.textContent = `${selected[key]}${unit}`; draw(); save(selected); } }));
  }
  function renderSide() {
    const off = eq.filter(e => !(e.plan_id === plan.id && e.plan_x != null));
    clear(side,
      selected ? h('div', { class: 'panel', style: { marginBottom: '12px' } }, h('h3', {}, selected.name || F.meta.equipment_types[selected.type]),
        selected.type === 'camera' ? [slider('Smer', 'dir', 0, 359, 1, '°'), slider('Vidni kot', 'fov', 10, 360, 5, '°'), slider('Doseg', 'range', 0.02, 0.6, 0.01, '')] : null,
        h('button', { class: 'btn btn-sm', onclick: () => { selected.plan_id = null; selected.plan_x = null; selected.plan_y = null; save(selected); selected = null; renderSide(); draw(); } }, 'Odstrani s tlorisa')) : null,
      h('h3', {}, 'Postavi na tloris'),
      off.length ? h('div', { class: 'list' }, off.map(e => h('button', { class: 'list-item', style: { width: '100%', border: 0, background: placing === e ? 'var(--panel-3)' : 'none', font: 'inherit', textAlign: 'left' }, onclick: () => { placing = e; stage.classList.add('placing'); toast('Kliknite mesto na tlorisu'); renderSide(); } },
        h('span', { class: 'avatar', style: { background: COLOR[e.type] || '#475569', color: '#fff', width: '28px', height: '28px', fontSize: '12px' } }, SHORT[e.type] || '•'),
        h('div', { class: 'main' }, h('strong', {}, e.name || F.meta.equipment_types[e.type]), h('small', {}, [e.model, e.location].filter(Boolean).join(' · ')))))) : h('p', { class: 'muted' }, 'Vsa oprema je na tlorisu.'),
      h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '10px' } }, 'Oznake premikate z vlečenjem. Kamero izberite za nastavitev smeri, kota in dosega.'));
  }
  const planSel = select(site.plans.map(p => [p.id, p.name]), plan.id, { style: { width: 'auto' }, onchange: e => { plan = site.plans.find(p => p.id == e.target.value); load(); } });
  const load = () => {
    img.onload = () => { W = 1000; H = Math.round(1000 * img.naturalHeight / img.naturalWidth) || 700; draw(); };
    img.src = `/api/plans/${plan.id}/image`;
    renderSide();
  };
  root.append(
    h('div', { class: 'btn-row noprint', style: { marginBottom: '10px' } }, planSel,
      h('button', { class: 'btn btn-sm', onclick: () => uploadPlan(site, reload) }, icon('plus', 14), 'Nov tloris'),
      h('button', { class: 'btn btn-sm', onclick: () => window.print() }, 'Natisni'),
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmDialog(`Izbrišem tloris "${plan.name}"?`, { danger: true, ok: 'Izbriši' })) { await del(`/api/plans/${plan.id}`); reload(); } } }, 'Izbriši tloris')),
    h('div', { class: 'plan-ed' }, h('div', {}, stage), h('div', { class: 'noprint' }, side)));
  load();
  return root;
}

// ---------- omrežna shema (iz polja "Priključeno na") ----------
export function networkMap(site) {
  const eq = site.equipment;
  if (!eq.length) return emptyState('Ni opreme', 'Shema se izriše samodejno iz opreme in polja "Priključeno na".');
  const byId = new Map(eq.map(e => [e.id, e]));
  const children = new Map();
  const roots = [];
  for (const e of eq) {
    if (e.connected_to && byId.has(e.connected_to) && e.connected_to !== e.id) {
      if (!children.has(e.connected_to)) children.set(e.connected_to, []);
      children.get(e.connected_to).push(e);
      children.get(e.connected_to).sort((a, b) => (parseInt(a.port) || 999) - (parseInt(b.port) || 999) || String(a.name).localeCompare(String(b.name)));
    } else roots.push(e);
  }
  const order = { router: 0, switch: 1, nvr: 2, ups: 3 };
  roots.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  // širina poddrevesa v listih
  const seen = new Set();
  const leaves = e => { if (seen.has(e.id)) return 1; seen.add(e.id); const c = children.get(e.id) || []; return c.length ? c.reduce((a, x) => a + leaves(x), 0) : 1; };
  const BW = 150, BH = 54, GX = 16, GY = 70;
  const total = roots.reduce((a, r) => a + leaves(r), 0);
  const width = Math.max(600, total * (BW + GX) + GX);
  let depthMax = 0;
  const nodes = [], links = [];
  const placed = new Set();
  const place = (e, x0, depth) => {
    if (placed.has(e.id)) return;
    placed.add(e.id);
    depthMax = Math.max(depthMax, depth);
    seen.clear();
    const w = leaves(e) * (BW + GX);
    const x = x0 + w / 2 - BW / 2, y = 20 + depth * (BH + GY);
    nodes.push({ e, x, y });
    let cx = x0;
    for (const c of children.get(e.id) || []) {
      seen.clear();
      const cw = leaves(c) * (BW + GX);
      links.push({ from: { x: x + BW / 2, y: y + BH }, to: { x: cx + cw / 2, y: y + BH + GY }, port: c.port });
      place(c, cx, depth + 1);
      cx += cw;
    }
  };
  let x0 = GX / 2;
  for (const r of roots) { seen.clear(); const w = leaves(r) * (BW + GX); place(r, x0, 0); x0 += w; }
  const height = 40 + (depthMax + 1) * (BH + GY);
  const svg = S('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Omrežna shema', style: `max-width:${width}px` });
  for (const l of links) {
    const my = (l.from.y + l.to.y) / 2;
    svg.append(S('path', { d: `M ${l.from.x} ${l.from.y} V ${my} H ${l.to.x} V ${l.to.y}`, fill: 'none', stroke: '#94a3b8', 'stroke-width': 1.5 }));
    if (l.port) { const t = S('text', { x: l.to.x + 4, y: l.to.y - 6, class: 'sub' }); t.textContent = `vrata ${l.port}`; svg.append(t); }
  }
  for (const { e, x, y } of nodes) {
    const g = S('g');
    g.append(S('rect', { x, y, width: BW, height: BH, rx: 8, fill: 'var(--panel)', stroke: COLOR[e.type] || '#64748b', 'stroke-width': 2 }));
    g.append(S('rect', { x, y, width: 6, height: BH, rx: 3, fill: COLOR[e.type] || '#64748b' }));
    const t1 = S('text', { x: x + 14, y: y + 20, 'font-weight': 600 }); t1.textContent = (e.name || F.meta.equipment_types[e.type]).slice(0, 20);
    const t2 = S('text', { x: x + 14, y: y + 36, class: 'sub' }); t2.textContent = (e.ip || e.model || F.meta.equipment_types[e.type] || '').slice(0, 22);
    g.append(t1, t2);
    svg.append(g);
  }
  return h('div', {}, h('div', { class: 'btn-row noprint', style: { marginBottom: '10px' } }, h('button', { class: 'btn btn-sm', onclick: () => window.print() }, 'Natisni shemo'),
    h('span', { class: 'muted', style: { fontSize: '13px' } }, 'Povezave nastavite pri napravi s poljem "Priključeno na".')),
    h('div', { class: 'panel netmap', style: { overflowX: 'auto' } }, svg));
}
