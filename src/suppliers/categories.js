// Lastna, pregledna razvrstitev artiklov (Skupina › Podskupina) namesto razvejanega drevesa dobavitelja,
// ki meša proizvajalce, velike črke in podvojene veje. Pravila delujejo na imenih kategorij in nazivu izdelka.

const WIRELESS = /brezžič|brezzic|wireless|868|wi-?fi|\bwifi\b|radijsk/;
const KIT = /komplet|\bkit\b|\bset\b/;

/** Vrne »Skupina › Podskupina« za izdelek s potjo kategorij dobavitelja (seznam imen) in nazivom. */
export function classify(pathNames, productName = '') {
  const names = (pathNames || []).map(s => String(s || '').trim()).filter(Boolean);
  const top = (names[0] || '').toLowerCase();
  const p = names.join(' › ').toLowerCase();
  const n = String(productName || '').toLowerCase();
  const rest = names.slice(1).join(' › ').toLowerCase();
  const pick = (rules, fallback) => { for (const [re, label, where = rest] of rules) if (re.test(where)) return label; return fallback; };

  if (/video\s*nadzor/.test(top)) {
    return `Videonadzor › ${pick([
      [/komplet|\bkit\b/, 'Kompleti'],
      [/nosil|podaljš|podaljs|ohišj|ohisj/, 'Nosilci in ohišja'],
      [/hdd|disk|sd kartic/, 'Diski in SD kartice'],
      [/napajal|napajanj/, 'Napajanje'],
      [/kabl|konektor/, 'Kabli in konektorji'],
      [/dvr|nvr|snemal/, 'Snemalniki (NVR/DVR)'],
      [/wi-?fi|baterij|\b4g\b|mobiln/, 'Brezžične kamere (Wi‑Fi, 4G, baterija)'],
      [/reg\.? ?tablic|termaln/, 'Posebne kamere'],
      [/ip kamer|hd-ip/, 'IP kamere'],
      [/^kamere$|hd-cvi|bnc/, 'Analogne kamere (HD-CVI)'],
      [/kamer/, 'IP kamere'],
    ], 'Dodatki in programska oprema')}`;
  }

  if (/alarm/.test(top)) {
    return `Alarmi › ${pick([
      [/požar|pozar|dim/, 'Požarno javljanje'],
      [/komplet/, 'Kompleti'],
      [/central/, 'Centrale'],
      [/siren/, 'Sirene'],
      [/akumulator/, 'Akumulatorji in napajanje'],
      [/nalepk|pomoč|pomoc/, 'Dodatki'],
      [/brezžič|brezzic/, 'Brezžični sistemi'],
      [/žič|zic/, 'Žični sistemi'],
      [/pir|magnet|barier|senzor/, 'Senzorji in javljalniki'],
      [/dodat/, 'Dodatki'],
      // kategorije, ki so samo ime proizvajalca (npr. »DAHUA alarm«): odločimo po nazivu izdelka
      [KIT, 'Kompleti', n],
      [/siren/, 'Sirene', n],
      [WIRELESS, 'Brezžični sistemi', n],
    ], 'Žični sistemi')}`;
  }

  if (/domofon/.test(top)) {
    return `Domofoni › ${pick([
      [/komplet/, 'Kompleti'],
      [/zvonec|kukal/, 'Video zvonci in kukala'],
      [/zunanje enote/, 'Zunanje enote'],
      [/notranje enote/, 'Notranje enote'],
      [/modularn/, 'Modularni sistemi'],
      [/ključavnic|kljucavnic/, 'Električne ključavnice'],
      [/pozivnik|interkom/, 'Pozivniki in interkom'],
      [KIT, 'Kompleti', n],
      [/notranj|monitor|indoor/, 'Notranje enote', n],
      [/zunanj|outdoor|panel|tipkovnic/, 'Zunanje enote', n],
    ], 'Dodatki')}`;
  }

  if (/kontrola|pristop/.test(top)) {
    return `Kontrola pristopa › ${pick([
      [/zapornic|ovir|stebrič|stebric|stožc|stozc|ogledal/, 'Zapornice in parkirišča'],
      [/delovnega časa|delovnega casa/, 'Registracija delovnega časa'],
      [/ključavnic|kljucavnic/, 'Električne ključavnice'],
      [/kartic|ključki|kljucki|daljinsk/, 'Kartice, obeski in daljinci'],
    ], 'Čitalniki in krmilniki')}`;
  }

  if (/\bit\b|omrež|omrez|mrež/.test(top)) {
    return `Omrežje › ${pick([
      [/kabinet|polic|patch panel|hlajenj|organizator|razdelilc/, 'Komunikacijske omare'],
      [/poe/, 'PoE napajanje'],
      [/stikal|switch/, 'Stikala'],
      [/usmerjeval|router|lte/, 'Usmerjevalniki in LTE'],
      [/dostopne točke|dostopne tocke|bridge|ojačeval|ojaceval|powerline/, 'Wi‑Fi in brezžične povezave'],
      [/\bups\b/, 'UPS'],
      [/optik|sfp/, 'Optika'],
      [/kabl|konektor|ožičenj|ozicenj/, 'Kabli in konektorji'],
    ], 'Ostala IT oprema')}`;
  }

  // ostale skupine dobavitelja (npr. Dom in oprema): skupina »Drugo«, podskupina iz druge ravni
  const sub = names[1] || names[0] || 'Ostalo';
  return `Drugo › ${niceCase(sub)}`;
}

/** »SOLARNA oprema« → »Solarna oprema«; kratice (UPS, LCD) ostanejo. */
export function niceCase(s) {
  return String(s).split(' ').map((w, i) => (w.length > 3 && w === w.toUpperCase() ? w.toLowerCase() : w))
    .join(' ').replace(/^./, c => c.toUpperCase());
}
