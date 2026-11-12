// VisionOne portal kot namestljiva aplikacija (PWA): namestitev, posodobitve in delo brez povezave.
import { h, toast } from './lib/core.js';

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMac = /Macintosh/.test(ua) && !isIOS;
const isWindows = /Windows/.test(ua);
const isEdge = /Edg\//.test(ua);
const isChromium = /Chrome\//.test(ua) || isEdge;
const isSafari = /Safari\//.test(ua) && !isChromium && !/CriOS|FxiOS|EdgiOS/.test(ua);
const isFirefox = /Firefox\//.test(ua);
const iosOtherBrowser = isIOS && /CriOS|FxiOS|EdgiOS/.test(ua);

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;

export function initPwa() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; notify(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); toast('VisionOne portal je nameščen kot aplikacija.'); });
  if (isInstalled()) document.documentElement.classList.add('is-app');
  registerWorker();
  watchConnection();
}

// ---------- posodobitve ----------
function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(reg => {
    const offer = w => updateBar(() => w.postMessage('SKIP_WAITING'));
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
    // nameščena aplikacija je lahko odprta več dni: preverimo ob vrnitvi v aplikacijo in vsako uro
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

function updateBar(apply) {
  if (document.querySelector('.pwa-update')) return;
  const bar = h('div', { class: 'pwa-update', role: 'status' },
    h('span', {}, 'Na voljo je nova različica portala.'),
    h('button', { class: 'btn btn-sm btn-primary', onclick: () => { bar.querySelector('button').disabled = true; apply(); } }, 'Posodobi'),
    h('button', { class: 'btn btn-sm', onclick: () => bar.remove() }, 'Kasneje'));
  document.body.append(bar);
}

// ---------- brez povezave ----------
function watchConnection() {
  const bar = h('div', { class: 'pwa-offline', role: 'status', hidden: true },
    'Ni povezave z internetom. Prikazani so zadnji shranjeni podatki, sprememb ni mogoče shraniti.');
  document.body.append(bar);
  let servedFromCache = false;
  const set = () => { const off = !navigator.onLine || servedFromCache; bar.hidden = !off; document.documentElement.classList.toggle('is-offline', off); };
  // navigator.onLine ne zazna vedno slabe povezave, zato upoštevamo tudi odgovore iz shranjenih podatkov
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await origFetch(...args);
    const url = String(args[0]?.url || args[0] || '');
    if (url.includes('/api/')) { const was = servedFromCache; servedFromCache = res.headers.get('X-V1-Offline') === '1'; if (was !== servedFromCache) set(); }
    return res;
  };
  window.addEventListener('online', () => { set(); toast('Povezava je spet vzpostavljena.'); });
  window.addEventListener('offline', set);
  set();
}

/** Ob odjavi z naprave izbrišemo shranjene podatke strank. */
export async function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage('CLEAR_DATA');
    if ('caches' in window) await caches.delete('v1portal-api');
  } catch { /* brez predpomnilnika */ }
}

// ---------- namestitev ----------
function platformLabel() {
  if (isIOS) return 'iPhone ali iPad';
  if (isMac) return 'Mac';
  if (isWindows) return 'Windows';
  return 'ta naprava';
}

/** Navodila ali gumb za namestitev, prilagojeno napravi in brskalniku. */
function installContent(compact) {
  if (isInstalled()) return h('p', { class: 'muted' }, 'Portal že uporabljate kot nameščeno aplikacijo.');
  if (deferredPrompt) {
    return h('div', { class: 'pwa-actions' },
      compact ? null : h('p', {}, `Portal namestite kot aplikacijo za ${platformLabel()}. Odpira se v svojem oknu, ima ikono na namizju oziroma v meniju Start in deluje tudi ob slabi povezavi.`),
      h('button', { class: 'btn btn-primary', onclick: async () => {
        const p = deferredPrompt; deferredPrompt = null;
        p.prompt();
        const { outcome } = await p.userChoice.catch(() => ({}));
        if (outcome !== 'accepted') deferredPrompt = p;
        notify();
      } }, 'Namesti aplikacijo'));
  }
  let steps;
  if (iosOtherBrowser) steps = ['Portal odprite v brskalniku Safari (portal.visionone.si).', 'Tapnite gumb Deli (kvadrat s puščico navzgor).', 'Izberite »Dodaj na začetni zaslon« in potrdite z »Dodaj«.'];
  else if (isIOS) steps = ['Tapnite gumb Deli (kvadrat s puščico navzgor) v spodnji ali zgornji vrstici Safarija.', 'Izberite »Dodaj na začetni zaslon«.', 'Potrdite z »Dodaj«. Ikona VisionOne se pojavi na začetnem zaslonu.'];
  else if (isMac && isSafari) steps = ['V menijski vrstici izberite Datoteka → Dodaj v Dock (Safari 17 ali novejši).', 'Potrdite ime VisionOne in kliknite Dodaj.', 'Aplikacija se pojavi v Docku in v mapi Aplikacije.'];
  else if (isFirefox) steps = ['Firefox nameščanja spletnih aplikacij ne podpira.', `Portal odprite v brskalniku ${isMac ? 'Safari, Chrome ali Edge' : 'Edge ali Chrome'} in ga namestite od tam.`];
  else if (isChromium) steps = [`V naslovni vrstici kliknite ikono za namestitev (zaslon s puščico) ali odprite meni ${isEdge ? '… → Aplikacije → Namesti to spletno mesto kot aplikacijo' : '⋮ → Shrani in deli → Namesti stran kot aplikacijo'}.`, 'Potrdite z Namesti.'];
  else steps = ['Odprite meni brskalnika in izberite možnost za namestitev aplikacije ali dodajanje na začetni zaslon.'];
  return h('div', {},
    compact ? null : h('p', {}, `Portal lahko namestite kot aplikacijo za ${platformLabel()}: odpira se v svojem oknu, ima svojo ikono in deluje tudi ob slabi povezavi.`),
    h('ol', { class: 'pwa-steps' }, steps.map(s => h('li', {}, s))));
}

/** Plošča v Nastavitvah. */
export function installPanel() {
  const box = h('div', {});
  const render = () => { box.replaceChildren(installContent(false)); };
  render();
  listeners.add(render);
  return h('div', { class: 'panel' }, h('h2', {}, 'Aplikacija na napravi'), box,
    h('p', { class: 'muted pwa-note' }, 'Deluje na iPhonu in iPadu (Safari), v sistemih Windows (Edge, Chrome) in macOS (Safari, Chrome, Edge). Posodobitve se namestijo same.'));
}

/** Diskreten predlog na začetni strani, dokler aplikacija ni nameščena ali ga uporabnik ne skrije. */
export function installHint() {
  const KEY = 'v1-pwa-hint-hidden';
  let hidden = false;
  try { hidden = localStorage.getItem(KEY) === '1'; } catch { /* zasebni način */ }
  if (hidden || isInstalled() || (isFirefox && !isIOS)) return null;
  if (!isIOS && !deferredPrompt && !(isMac && isSafari)) return null;
  const el = h('div', { class: 'pwa-hint' },
    h('img', { src: '/icons/icon-192.png', alt: '', width: 40, height: 40 }),
    h('div', { class: 'pwa-hint-body' },
      h('strong', {}, 'Namestite VisionOne portal kot aplikacijo'),
      h('a', { href: '#/nastavitve', class: 'pwa-hint-link' }, isIOS ? 'Navodila za iPhone' : 'Kako namestiti')),
    deferredPrompt ? h('button', { class: 'btn btn-sm btn-primary', onclick: async () => {
      const p = deferredPrompt; deferredPrompt = null; p.prompt(); await p.userChoice.catch(() => {}); el.remove(); notify();
    } }, 'Namesti') : null,
    h('button', { class: 'btn-icon', 'aria-label': 'Skrij', onclick: () => { try { localStorage.setItem(KEY, '1'); } catch { /* */ } el.remove(); } }, '×'));
  return el;
}

/** Povezava pod prijavnim obrazcem. */
export function loginInstallNote() {
  if (isInstalled()) return null;
  return h('details', { class: 'pwa-login' }, h('summary', {}, 'Namesti kot aplikacijo'), installContent(true));
}
