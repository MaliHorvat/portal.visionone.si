"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calculator, Image as ImageIcon, Network, Scan, Shield, Wifi } from "lucide-react";

function mockScan(start: string, end: string) {
  const base = start.replace(/\.\d+$/, "");
  return [
    { ip: `${base}.1`, mac: "00:11:22:33:44:01", host: "router.gateway" },
    { ip: `${base}.10`, mac: "aa:bb:cc:dd:ee:ff", host: "nvr.local" },
    { ip: `${base}.50`, mac: "de:ad:be:ef:00:01", host: "cam-vhod" },
  ].filter(() => start && end);
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function genPassword(len: number, opts: { upper: boolean; lower: boolean; digits: boolean; special: boolean }) {
  const pools: string[] = [];
  if (opts.lower) pools.push("abcdefghijklmnopqrstuvwxyz");
  if (opts.upper) pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (opts.digits) pools.push("0123456789");
  if (opts.special) pools.push("!@#$%^&*()-_=+[]{};:,.?/|");
  if (pools.length === 0) return "";
  const all = pools.join("");
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += all[bytes[i] % all.length];
  return out;
}

function normalizeMac(input: string) {
  const cleaned = input.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (cleaned.length < 12) return null;
  const mac = cleaned.slice(0, 12);
  return mac.match(/.{1,2}/g)?.join(":") ?? null;
}

const OUI: Record<string, string> = {
  "00:11:22": "DemoVendor",
  "aa:bb:cc": "DemoCam",
  "de:ad:be": "DemoNet",
};

export default function OrodjaPage() {
  const sp = useSearchParams();
  const tool = sp.get("tool") || "ip-scan";

  const [startIp, setStartIp] = useState("192.168.1.1");
  const [endIp, setEndIp] = useState("192.168.1.30");
  const [scanResult, setScanResult] = useState<ReturnType<typeof mockScan>>([]);
  const [mac, setMac] = useState("aa:bb:cc:dd:ee:ff");
  const [wolMsg, setWolMsg] = useState<string | null>(null);
  const [pwLen, setPwLen] = useState(16);
  const [pwOpt, setPwOpt] = useState({ upper: true, lower: true, digits: true, special: false });
  const [password, setPassword] = useState("");
  const [macInput, setMacInput] = useState("aa:bb:cc:dd:ee:ff");
  const [ipam, setIpam] = useState<Array<{ ip: string; name: string; mac?: string }>>([]);
  const [ipamIp, setIpamIp] = useState("");
  const [ipamName, setIpamName] = useState("");
  const [ipamMac, setIpamMac] = useState("");
  const [poePorts, setPoePorts] = useState(8);
  const [poePerPortW, setPoePerPortW] = useState(7);
  const [poeBudgetW, setPoeBudgetW] = useState(120);
  const [storCams, setStorCams] = useState(8);
  const [storBitrate, setStorBitrate] = useState(4);
  const [storDays, setStorDays] = useState(14);
  const [storOverhead, setStorOverhead] = useState(15);
  const [lccCapex, setLccCapex] = useState(2500);
  const [lccOpex, setLccOpex] = useState(300);
  const [lccYears, setLccYears] = useState(5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vo_ipam");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ ip: string; name: string; mac?: string }>;
      if (Array.isArray(parsed)) setIpam(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("vo_ipam", JSON.stringify(ipam));
    } catch {}
  }, [ipam]);

  const poeTotal = poePorts * poePerPortW;
  const poeMargin = poeBudgetW - poeTotal;

  const storageTb = useMemo(() => {
    const cams = Math.max(0, storCams);
    const mbps = Math.max(0, storBitrate);
    const days = Math.max(0, storDays);
    const overhead = Math.max(0, storOverhead);
    const seconds = days * 86400;
    const bytesPerSec = (mbps * 1_000_000) / 8;
    const totalBytes = bytesPerSec * seconds * cams;
    const totalWithOverhead = totalBytes * (1 + overhead / 100);
    const tb = totalWithOverhead / 1_000_000_000_000;
    return Math.round(tb * 100) / 100;
  }, [storBitrate, storCams, storDays, storOverhead]);

  const lccTotal = useMemo(() => {
    const years = Math.max(0, lccYears);
    return Math.round((Math.max(0, lccCapex) + Math.max(0, lccOpex) * years) * 100) / 100;
  }, [lccCapex, lccOpex, lccYears]);

  const macNorm = normalizeMac(macInput);
  const macVendor = macNorm ? OUI[macNorm.slice(0, 8)] ?? "Neznan (ni OUI baze)" : null;


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Orodja in diagnostika</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Orodja so zbrana na eni strani; v meniju se preklaplja prek parametra{" "}
          <span className="font-mono">tool</span>.
        </p>
      </div>
      {tool === "ip-scan" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Scan className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">IP scanner</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Začetni IP</span>
              <input value={startIp} onChange={(e) => setStartIp(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Končni IP</span>
              <input value={endIp} onChange={(e) => setEndIp(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
            </label>
          </div>
          <button type="button" onClick={() => setScanResult(mockScan(startIp, endIp))} className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]">
            Zaženi sken (demo)
          </button>
          {scanResult.length > 0 ? (
            <table className="mt-4 w-full text-left text-xs">
              <thead className="text-[var(--vo-muted)]">
                <tr>
                  <th className="py-1">IP</th>
                  <th className="py-1">MAC</th>
                  <th className="py-1">Opomba</th>
                </tr>
              </thead>
              <tbody>
                {scanResult.map((r) => (
                  <tr key={r.ip} className="border-t border-[var(--vo-border)]">
                    <td className="py-2 font-mono">{r.ip}</td>
                    <td className="py-2 font-mono">{r.mac}</td>
                    <td className="py-2 text-[var(--vo-muted)]">{r.host}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {tool === "wol" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Wifi className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Wake on LAN</h2>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-[var(--vo-muted)]">MAC naslov</span>
            <input value={mac} onChange={(e) => setMac(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
          </label>
          <button type="button" onClick={() => setWolMsg(`Magic packet poslan na ${mac} (demo).`)} className="mt-4 rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm font-semibold text-[var(--vo-fg)] hover:bg-[var(--vo-surface-2)]">
            Pošlji WoL
          </button>
          {wolMsg ? <p className="mt-3 text-sm text-[var(--vo-ok)]">{wolMsg}</p> : null}
        </section>
      ) : null}

      {tool === "pw" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Shield className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Generator gesel</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Dolžina</span>
              <input type="number" value={pwLen} onChange={(e) => setPwLen(clampInt(Number(e.target.value) || 0, 6, 64))} className="mt-1 w-24 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--vo-muted)]">
              <input type="checkbox" checked={pwOpt.upper} onChange={(e) => setPwOpt((o) => ({ ...o, upper: e.target.checked }))} />
              Velike črke
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--vo-muted)]">
              <input type="checkbox" checked={pwOpt.lower} onChange={(e) => setPwOpt((o) => ({ ...o, lower: e.target.checked }))} />
              Male črke
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--vo-muted)]">
              <input type="checkbox" checked={pwOpt.digits} onChange={(e) => setPwOpt((o) => ({ ...o, digits: e.target.checked }))} />
              Številke
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--vo-muted)]">
              <input type="checkbox" checked={pwOpt.special} onChange={(e) => setPwOpt((o) => ({ ...o, special: e.target.checked }))} />
              Posebni znaki
            </label>
            <button type="button" className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white" onClick={() => setPassword(genPassword(pwLen, pwOpt))}>
              Generiraj
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input readOnly value={password} placeholder="—" className="min-w-[260px] flex-1 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
            <button
              type="button"
              disabled={!password}
              className="rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password);
                } catch {}
              }}
            >
              Kopiraj
            </button>
          </div>
        </section>
      ) : null}

      {tool === "poe" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Calculator className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">PoE kalkulator</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Št. portov</span>
              <input type="number" value={poePorts} onChange={(e) => setPoePorts(clampInt(Number(e.target.value) || 0, 0, 96))} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">W / port</span>
              <input type="number" value={poePerPortW} onChange={(e) => setPoePerPortW(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">PoE budget (W)</span>
              <input type="number" value={poeBudgetW} onChange={(e) => setPoeBudgetW(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="text-[var(--vo-muted)]">Skupaj poraba</div>
                <div className="text-lg font-bold text-[var(--vo-fg)]">{poeTotal.toFixed(1)} W</div>
              </div>
              <div>
                <div className="text-[var(--vo-muted)]">Rezerva</div>
                <div className={`text-lg font-bold ${poeMargin >= 0 ? "text-[var(--vo-ok)]" : "text-[var(--vo-danger)]"}`}>{poeMargin.toFixed(1)} W</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tool === "storage" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Calculator className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Kalkulator shrambe</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Kamere</span>
              <input type="number" value={storCams} onChange={(e) => setStorCams(clampInt(Number(e.target.value) || 0, 0, 512))} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Bitrate (Mbps)</span>
              <input type="number" value={storBitrate} onChange={(e) => setStorBitrate(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Dni</span>
              <input type="number" value={storDays} onChange={(e) => setStorDays(clampInt(Number(e.target.value) || 0, 0, 365))} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Overhead %</span>
              <input type="number" value={storOverhead} onChange={(e) => setStorOverhead(clampInt(Number(e.target.value) || 0, 0, 200))} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm">
            <div className="text-[var(--vo-muted)]">Ocena prostora (TB)</div>
            <div className="text-2xl font-bold text-[var(--vo-accent)]">{storageTb.toFixed(2)} TB</div>
          </div>
        </section>
      ) : null}

      {tool === "lcc" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Calculator className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Kalkulator LCC</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">CAPEX (€)</span>
              <input type="number" value={lccCapex} onChange={(e) => setLccCapex(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">OPEX / leto (€)</span>
              <input type="number" value={lccOpex} onChange={(e) => setLccOpex(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Leta</span>
              <input type="number" value={lccYears} onChange={(e) => setLccYears(clampInt(Number(e.target.value) || 0, 0, 20))} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm">
            <div className="text-[var(--vo-muted)]">Skupni LCC</div>
            <div className="text-2xl font-bold text-[var(--vo-accent)]">{lccTotal.toFixed(2)} €</div>
          </div>
        </section>
      ) : null}

      {tool === "mac" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Network className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">MAC lookup</h2>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-[var(--vo-muted)]">MAC</span>
            <input value={macInput} onChange={(e) => setMacInput(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
          </label>
          <div className="mt-4 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm">
            <div className="text-[var(--vo-muted)]">Normaliziran</div>
            <div className="font-mono text-[var(--vo-fg)]">{macNorm ?? "Neveljaven MAC"}</div>
            <div className="mt-2 text-[var(--vo-muted)]">Vendor (demo)</div>
            <div className="text-[var(--vo-fg)]">{macVendor ?? "—"}</div>
          </div>
        </section>
      ) : null}

      {tool === "ipam" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Network className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">IPAM (lokalno)</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <input placeholder="IP" value={ipamIp} onChange={(e) => setIpamIp(e.target.value)} className="w-40 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
            <input placeholder="Ime" value={ipamName} onChange={(e) => setIpamName(e.target.value)} className="min-w-[200px] flex-1 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm" />
            <input placeholder="MAC (opcijsko)" value={ipamMac} onChange={(e) => setIpamMac(e.target.value)} className="w-44 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm" />
            <button
              type="button"
              className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                if (!ipamIp.trim() || !ipamName.trim()) return;
                setIpam((prev) => [{ ip: ipamIp.trim(), name: ipamName.trim(), mac: ipamMac.trim() || undefined }, ...prev]);
                setIpamIp("");
                setIpamName("");
                setIpamMac("");
              }}
            >
              + Dodaj
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--vo-border)]">
            <table className="min-w-[640px] w-full text-left text-xs">
              <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
                <tr>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Ime</th>
                  <th className="px-3 py-2">MAC</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {ipam.map((r, i) => (
                  <tr key={`${r.ip}-${i}`} className="border-b border-[var(--vo-border)]">
                    <td className="px-3 py-2 font-mono">{r.ip}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-[var(--vo-muted)]">{r.mac ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-red-500 hover:underline" onClick={() => setIpam((p) => p.filter((_, j) => j !== i))}>
                        Izbriši
                      </button>
                    </td>
                  </tr>
                ))}
                {ipam.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--vo-muted)]">
                      Ni vnosov.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tool === "snapshot" ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <ImageIcon className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Zadnji snapshot (kamera)</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--vo-muted)]">Mock slika — stream/GET thumbnail iz storitve.</p>
          <div className="mt-4 aspect-video max-w-xl overflow-hidden rounded-lg border border-[var(--vo-border)] bg-gradient-to-br from-slate-800 via-slate-700 to-teal-900">
            <div className="flex h-full items-center justify-center text-sm text-white/80">Snapshot placeholder</div>
          </div>
        </section>
      ) : null}

      {["wifi", "ping", "nvr", "lpr", "bulk", "qr"].includes(tool) ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Wifi className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">V izdelavi</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--vo-muted)]">
            To orodje je na seznamu v meniju, UI je pripravljena, backend/logika pa je še v izdelavi.
          </p>
        </section>
      ) : null}
    </div>
  );
}
