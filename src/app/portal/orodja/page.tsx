"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calculator, Image as ImageIcon, Network, Shield, Wifi } from "lucide-react";
import { DecimalInput } from "@/components/portal/DecimalInput";
import { LanNetworkScanner } from "@/components/portal/LanNetworkScanner";
import { OrodjaToolNav, OrodjaToolSection } from "@/components/portal/OrodjaToolNav";
import { isOrodjaToolId } from "@/lib/orodja-tools";

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
  const toolParam = sp.get("tool");
  const tool = isOrodjaToolId(toolParam) ? toolParam : "ip-scan";

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
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [pingCards, setPingCards] = useState<Array<{ id: string; name: string; ip: string; status: "online" | "offline" }>>([]);

  const [ipamReady, setIpamReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal-ipam", { credentials: "include" });
        if (res.ok) {
          const j = (await res.json()) as { entries?: Array<{ ip: string; name: string; mac?: string }> };
          if (!cancelled && Array.isArray(j.entries) && j.entries.length > 0) {
            setIpam(j.entries.map((e) => ({ ip: e.ip, name: e.name, mac: e.mac || undefined })));
            setIpamReady(true);
            return;
          }
        }
      } catch {
        /* fallback spodaj */
      }
      try {
        const raw = localStorage.getItem("vo_ipam");
        if (!raw) return;
        const parsed = JSON.parse(raw) as Array<{ ip: string; name: string; mac?: string }>;
        if (!cancelled && Array.isArray(parsed) && parsed.length > 0) {
          setIpam(parsed);
          void fetch("/api/portal-ipam", {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries: parsed }),
          });
        }
      } catch {}
      if (!cancelled) setIpamReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ipamReady) return;
    const t = window.setTimeout(() => {
      void fetch("/api/portal-ipam", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: ipam }),
      }).catch(() => {
        try {
          localStorage.setItem("vo_ipam", JSON.stringify(ipam));
        } catch {}
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [ipam, ipamReady]);

  useEffect(() => {
    if (tool !== "ping") return;
    void fetch("/api/clients")
      .then((r) => r.json())
      .then((j: { clients?: Array<{ id: string; name: string }> }) => {
        const rows = j.clients ?? [];
        setClients(rows);
        if (!selectedClientId && rows[0]?.id) setSelectedClientId(rows[0].id);
      })
      .catch(() => setClients([]));
  }, [selectedClientId, tool]);

  useEffect(() => {
    if (tool !== "ping" || !selectedClientId) return;
    let stopped = false;
    const load = async () => {
      try {
        const [clientRes, liveRes] = await Promise.all([
          fetch(`/api/clients/${selectedClientId}`, { cache: "no-store" }),
          fetch(`/api/clients/${selectedClientId}/device-status`, { cache: "no-store" }),
        ]);
        if (!clientRes.ok) return;
        const clientJson = (await clientRes.json()) as {
          client?: { cameras?: Array<{ id: string; name: string; ip: string; status: string }> };
        };
        const liveJson = liveRes.ok
          ? ((await liveRes.json()) as { cameras: Record<string, { status: string }> })
          : { cameras: {} };
        const cards: Array<{ id: string; name: string; ip: string; status: "online" | "offline" }> = (clientJson.client?.cameras ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          ip: c.ip,
          status: (liveJson.cameras?.[c.id]?.status ?? c.status) === "online" ? "online" : "offline",
        }));
        if (!stopped) setPingCards(cards);
      } catch {}
    };
    void load();
    const id = window.setInterval(load, 10_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [selectedClientId, tool]);

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
    <div className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:space-y-6">
      <header>
        <h1 className="vo-page-title text-xl sm:text-2xl">Orodja in diagnostika</h1>
        <p className="vo-page-desc mt-1 text-sm">
          Kalkulatorji in mrežna orodja — optimizirano za telefon in tablico. Izberite orodje spodaj.
        </p>
      </header>
      <OrodjaToolNav active={tool} />
      {tool === "ip-scan" ? (
        <LanNetworkScanner
          onAddToIpam={(entry) => {
            setIpam((prev) => {
              if (prev.some((e) => e.ip === entry.ip)) return prev;
              return [{ ip: entry.ip, name: entry.name }, ...prev];
            });
          }}
        />
      ) : null}

      {tool === "wol" ? (
        <OrodjaToolSection title="Wake on LAN" icon={Wifi}>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">MAC naslov</span>
            <input
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              className="vo-input vo-input-touch mt-1 w-full font-mono"
            />
          </label>
          <button
            type="button"
            onClick={() => setWolMsg(`Magic packet poslan na ${mac} (demo).`)}
            className="vo-touch-btn vo-btn-secondary mt-4 w-full sm:w-auto"
          >
            Pošlji WoL
          </button>
          {wolMsg ? <p className="mt-3 text-sm text-[var(--vo-ok)]">{wolMsg}</p> : null}
        </OrodjaToolSection>
      ) : null}

      {tool === "pw" ? (
        <OrodjaToolSection title="Generator gesel" icon={Shield}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Dolžina</span>
              <input
                type="number"
                inputMode="numeric"
                value={pwLen}
                onChange={(e) => setPwLen(clampInt(Number(e.target.value) || 0, 6, 64))}
                className="vo-input vo-input-touch mt-1 w-full max-w-[8rem]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 lg:flex lg:flex-wrap lg:gap-3">
              <label className="vo-touch-btn flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-[var(--vo-border)] px-3 text-sm text-[var(--vo-muted)]">
                <input type="checkbox" checked={pwOpt.upper} onChange={(e) => setPwOpt((o) => ({ ...o, upper: e.target.checked }))} className="h-4 w-4" />
                Velike
              </label>
              <label className="vo-touch-btn flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-[var(--vo-border)] px-3 text-sm text-[var(--vo-muted)]">
                <input type="checkbox" checked={pwOpt.lower} onChange={(e) => setPwOpt((o) => ({ ...o, lower: e.target.checked }))} className="h-4 w-4" />
                Male
              </label>
              <label className="vo-touch-btn flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-[var(--vo-border)] px-3 text-sm text-[var(--vo-muted)]">
                <input type="checkbox" checked={pwOpt.digits} onChange={(e) => setPwOpt((o) => ({ ...o, digits: e.target.checked }))} className="h-4 w-4" />
                Številke
              </label>
              <label className="vo-touch-btn flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-[var(--vo-border)] px-3 text-sm text-[var(--vo-muted)]">
                <input type="checkbox" checked={pwOpt.special} onChange={(e) => setPwOpt((o) => ({ ...o, special: e.target.checked }))} className="h-4 w-4" />
                Posebni
              </label>
            </div>
            <button
              type="button"
              className="vo-touch-btn vo-btn-primary w-full px-4 py-2.5 text-sm font-semibold sm:w-auto"
              onClick={() => setPassword(genPassword(pwLen, pwOpt))}
            >
              Generiraj
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              readOnly
              value={password}
              placeholder="—"
              className="vo-input vo-input-touch min-w-0 flex-1 font-mono text-base sm:text-sm"
            />
            <button
              type="button"
              disabled={!password}
              className="vo-touch-btn vo-btn-secondary w-full shrink-0 disabled:opacity-40 sm:w-auto"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password);
                } catch {}
              }}
            >
              Kopiraj
            </button>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "poe" ? (
        <OrodjaToolSection title="PoE kalkulator" icon={Calculator}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Št. portov</span>
              <input
                type="number"
                inputMode="numeric"
                value={poePorts}
                onChange={(e) => setPoePorts(clampInt(Number(e.target.value) || 0, 0, 96))}
                className="vo-input vo-input-touch mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">W / port</span>
              <DecimalInput value={poePerPortW} onChange={setPoePerPortW} className="vo-input vo-input-touch mt-1 w-full" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">PoE budget (W)</span>
              <DecimalInput value={poeBudgetW} onChange={setPoeBudgetW} className="vo-input vo-input-touch mt-1 w-full" />
            </label>
          </div>
          <div className="vo-mobile-card mt-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[var(--vo-muted)]">Skupaj poraba</div>
                <div className="text-xl font-bold text-[var(--vo-fg)]">{poeTotal.toFixed(1)} W</div>
              </div>
              <div>
                <div className="text-[var(--vo-muted)]">Rezerva</div>
                <div className={`text-xl font-bold ${poeMargin >= 0 ? "text-[var(--vo-ok)]" : "text-[var(--vo-danger)]"}`}>
                  {poeMargin.toFixed(1)} W
                </div>
              </div>
            </div>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "storage" ? (
        <OrodjaToolSection title="Kalkulator shrambe" icon={Calculator}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Kamere</span>
              <input
                type="number"
                inputMode="numeric"
                value={storCams}
                onChange={(e) => setStorCams(clampInt(Number(e.target.value) || 0, 0, 512))}
                className="vo-input vo-input-touch mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Mbps</span>
              <DecimalInput value={storBitrate} onChange={setStorBitrate} className="vo-input vo-input-touch mt-1 w-full" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Dni</span>
              <input
                type="number"
                inputMode="numeric"
                value={storDays}
                onChange={(e) => setStorDays(clampInt(Number(e.target.value) || 0, 0, 365))}
                className="vo-input vo-input-touch mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Overhead %</span>
              <input
                type="number"
                inputMode="numeric"
                value={storOverhead}
                onChange={(e) => setStorOverhead(clampInt(Number(e.target.value) || 0, 0, 200))}
                className="vo-input vo-input-touch mt-1 w-full"
              />
            </label>
          </div>
          <div className="vo-mobile-card mt-4 text-sm">
            <div className="text-[var(--vo-muted)]">Ocena prostora (TB)</div>
            <div className="text-3xl font-bold text-[var(--vo-accent)]">{storageTb.toFixed(2)} TB</div>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "lcc" ? (
        <OrodjaToolSection title="Kalkulator LCC" icon={Calculator}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">CAPEX (€)</span>
              <DecimalInput value={lccCapex} onChange={setLccCapex} className="vo-input vo-input-touch mt-1 w-full" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">OPEX / leto (€)</span>
              <DecimalInput value={lccOpex} onChange={setLccOpex} className="vo-input vo-input-touch mt-1 w-full" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Leta</span>
              <input
                type="number"
                inputMode="numeric"
                value={lccYears}
                onChange={(e) => setLccYears(clampInt(Number(e.target.value) || 0, 0, 20))}
                className="vo-input vo-input-touch mt-1 w-full"
              />
            </label>
          </div>
          <div className="vo-mobile-card mt-4 text-sm">
            <div className="text-[var(--vo-muted)]">Skupni LCC</div>
            <div className="text-3xl font-bold text-[var(--vo-accent)]">{lccTotal.toFixed(2)} €</div>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "mac" ? (
        <OrodjaToolSection title="MAC lookup" icon={Network}>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">MAC</span>
            <input
              value={macInput}
              onChange={(e) => setMacInput(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              className="vo-input vo-input-touch mt-1 w-full font-mono"
            />
          </label>
          <div className="vo-mobile-card mt-4 text-sm">
            <div className="text-[var(--vo-muted)]">Normaliziran</div>
            <div className="break-all font-mono text-base text-[var(--vo-fg)]">{macNorm ?? "Neveljaven MAC"}</div>
            <div className="mt-3 text-[var(--vo-muted)]">Vendor (demo)</div>
            <div className="text-[var(--vo-fg)]">{macVendor ?? "—"}</div>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "ipam" ? (
        <OrodjaToolSection title="IPAM (sinhronizacija z bazo)" icon={Network}>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap">
            <input
              placeholder="IP"
              value={ipamIp}
              onChange={(e) => setIpamIp(e.target.value)}
              inputMode="decimal"
              className="vo-input vo-input-touch font-mono lg:w-40"
            />
            <input
              placeholder="Ime"
              value={ipamName}
              onChange={(e) => setIpamName(e.target.value)}
              className="vo-input vo-input-touch min-w-0 lg:min-w-[200px] lg:flex-1"
            />
            <input
              placeholder="MAC (opcijsko)"
              value={ipamMac}
              onChange={(e) => setIpamMac(e.target.value)}
              autoCapitalize="off"
              className="vo-input vo-input-touch font-mono lg:w-44"
            />
            <button
              type="button"
              className="vo-touch-btn vo-btn-primary w-full px-4 py-2.5 text-sm font-semibold sm:col-span-2 lg:w-auto"
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
          <div className="mt-4 space-y-3 md:hidden">
            {ipam.map((r, i) => (
              <article key={`${r.ip}-${i}-m`} className="vo-mobile-card">
                <p className="font-mono text-base font-semibold">{r.ip}</p>
                <p className="mt-1 text-sm">{r.name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--vo-muted)]">{r.mac ?? "—"}</p>
                <button
                  type="button"
                  className="vo-touch-btn mt-3 text-sm font-semibold text-[var(--vo-danger)]"
                  onClick={() => setIpam((p) => p.filter((_, j) => j !== i))}
                >
                  Izbriši
                </button>
              </article>
            ))}
            {ipam.length === 0 ? <p className="text-center text-sm text-[var(--vo-muted)]">Ni vnosov.</p> : null}
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--vo-border)] md:block">
            <table className="w-full min-w-[520px] text-left text-xs">
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
                      <button type="button" className="text-[var(--vo-danger)] hover:underline" onClick={() => setIpam((p) => p.filter((_, j) => j !== i))}>
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
        </OrodjaToolSection>
      ) : null}

      {tool === "snapshot" ? (
        <OrodjaToolSection title="Zadnji snapshot (kamera)" icon={ImageIcon}>
          <p className="text-sm text-[var(--vo-muted)]">Mock slika — stream/GET thumbnail iz storitve.</p>
          <div className="mt-4 aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-[var(--vo-border)] bg-gradient-to-br from-slate-800 via-slate-700 to-teal-900">
            <div className="flex h-full items-center justify-center text-sm text-white/80">Snapshot placeholder</div>
          </div>
        </OrodjaToolSection>
      ) : null}

      {tool === "ping" ? (
        <OrodjaToolSection title="Ping watchdog (kamere)" icon={Network}>
          <label className="sr-only" htmlFor="ping-client-select">
            Stranka
          </label>
          <select
            id="ping-client-select"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="vo-select vo-input-touch w-full text-sm"
          >
            <option value="">— izberi stranko —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-[var(--vo-muted)]">Osvežitev statusa na 10 sekund.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pingCards.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg border p-3 ${
                  c.status === "online"
                    ? "border-emerald-400/30 bg-emerald-500/10"
                    : "border-red-400/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--vo-fg)]">{c.name}</p>
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      c.status === "online" ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"
                    }`}
                  />
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--vo-muted)]">{c.ip || "—"}</p>
                <p className="mt-2 text-xs font-medium">
                  {c.status === "online" ? (
                    <span className="text-[var(--vo-ok)]">ONLINE</span>
                  ) : (
                    <span className="text-[var(--vo-danger)]">OFFLINE</span>
                  )}
                </p>
              </div>
            ))}
            {selectedClientId && pingCards.length === 0 ? (
              <p className="col-span-full text-sm text-[var(--vo-muted)]">Za to stranko ni kamer.</p>
            ) : null}
          </div>
        </OrodjaToolSection>
      ) : null}

      {["wifi", "nvr", "lpr", "bulk", "qr"].includes(tool) ? (
        <OrodjaToolSection title="V izdelavi" icon={Wifi}>
          <p className="text-sm text-[var(--vo-muted)]">
            To orodje je na seznamu v meniju, UI je pripravljena, backend/logika pa je še v izdelavi.
          </p>
        </OrodjaToolSection>
      ) : null}
    </div>
  );
}
