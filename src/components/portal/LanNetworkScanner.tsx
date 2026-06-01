"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Plus, Radar, StopCircle, Wifi, Zap } from "lucide-react";
import {
  buildIpRange,
  detectLocalIpViaWebRtc,
  getLanScanProfile,
  ipToLong,
  isValidIpv4,
  scanLanRange,
  suggestQuickScanRange,
  suggestSubnetRange,
  type LanScanHost,
} from "@/lib/lan-scan";
import { useIsMobile } from "@/lib/use-media-query";

type Props = {
  onAddToIpam?: (entry: { ip: string; name: string }) => void;
};

function ScanResultCard({
  host,
  onAdd,
}: {
  host: LanScanHost;
  onAdd?: () => void;
}) {
  return (
    <article className="vo-mobile-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-base font-semibold text-[var(--vo-fg)]">{host.ip}</p>
        <span className="shrink-0 text-xs text-[var(--vo-muted)]">{host.latencyMs} ms</span>
      </div>
      <p className="mt-1 text-sm text-[var(--vo-fg)]">{host.deviceHint}</p>
      <p className="mt-2 font-mono text-xs text-[var(--vo-muted)]">
        {host.openPorts.length > 0 ? `Vrata: ${host.openPorts.join(", ")}` : "Odziv brez znanih HTTP vrat"}
      </p>
      {onAdd ? (
        <button type="button" onClick={onAdd} className="vo-touch-btn vo-btn-secondary mt-3 w-full text-sm">
          <Plus className="h-4 w-4" aria-hidden />
          Dodaj v IPAM
        </button>
      ) : null}
    </article>
  );
}

export function LanNetworkScanner({ onAddToIpam }: Props) {
  const isMobile = useIsMobile();
  const profile = getLanScanProfile(isMobile);

  const [startIp, setStartIp] = useState("192.168.1.1");
  const [endIp, setEndIp] = useState("192.168.1.254");
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<LanScanHost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);
  const [ipamAdded, setIpamAdded] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const detectNetwork = useCallback(async () => {
    setDetecting(true);
    setError(null);
    try {
      const ip = await detectLocalIpViaWebRtc(isMobile ? 4500 : 3500);
      if (!ip) {
        setError("Lokalnega IP ni bilo mogoče zaznati. Vnesite obseg ročno ali preverite dovoljenja brskalnika.");
        return;
      }
      setLocalIp(ip);
      const range = suggestSubnetRange(ip);
      if (range) {
        if (isMobile) {
          const quick = suggestQuickScanRange(ip);
          setStartIp(quick?.start ?? range.start);
          setEndIp(quick?.end ?? range.end);
        } else {
          setStartIp(range.start);
          setEndIp(range.end);
        }
      }
    } finally {
      setDetecting(false);
    }
  }, [isMobile]);

  useEffect(() => {
    void detectNetwork();
  }, [detectNetwork]);

  useEffect(() => {
    if (!scanning || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    void navigator.wakeLock
      ?.request("screen")
      .then((s) => {
        lock = s;
      })
      .catch(() => {});
    return () => {
      void lock?.release();
    };
  }, [scanning]);

  const applyFullRange = () => {
    if (!localIp) return;
    const range = suggestSubnetRange(localIp);
    if (range) {
      setStartIp(range.start);
      setEndIp(range.end);
    }
  };

  const applyQuickRange = () => {
    if (!localIp) return;
    const quick = suggestQuickScanRange(localIp);
    if (quick) {
      setStartIp(quick.start);
      setEndIp(quick.end);
    }
  };

  const runScan = async () => {
    setError(null);
    setRangeWarning(null);
    setIpamAdded(null);
    if (!isValidIpv4(startIp) || !isValidIpv4(endIp)) {
      setError("Vnesite veljavna IPv4 naslova (npr. 192.168.1.1 – 192.168.1.254).");
      return;
    }
    const s = ipToLong(startIp)!;
    const e = ipToLong(endIp)!;
    if (s > e) {
      setError("Začetni IP mora biti manjši ali enak končnemu.");
      return;
    }
    const count = e - s + 1;
    if (count > profile.maxHosts) {
      setRangeWarning(
        isMobile
          ? `Na telefonu skeniram največ ${profile.maxHosts} naslovov (iz ${count}). Uporabite »Hitri obseg« ali zožite ročno.`
          : `Obseg ima ${count} naslovov — skeniram prvih ${profile.maxHosts}.`,
      );
    }

    const ips = buildIpRange(startIp, endIp, profile.maxHosts);
    if (ips.length === 0) {
      setError("Prazen obseg IP naslovov.");
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setScanning(true);
    setResults([]);
    setProgress({ done: 0, total: ips.length });

    try {
      const hosts = await scanLanRange(ips, {
        signal: ac.signal,
        concurrency: profile.concurrency,
        timeoutMs: profile.timeoutMs,
        ports: profile.ports,
        onProgress: (p) => setProgress({ done: p.done, total: p.total }),
      });
      if (!ac.signal.aborted) setResults(hosts);
    } catch {
      if (!ac.signal.aborted) {
        setError("Skeniranje je spodletelo. Preverite Wi‑Fi, izklopite VPN in da ste na isti mreži kot naprave.");
      }
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  };

  const stopScan = () => {
    abortRef.current?.abort();
    setScanning(false);
  };

  const addToIpam = (host: LanScanHost) => {
    onAddToIpam?.({ ip: host.ip, name: host.deviceHint });
    setIpamAdded(host.ip);
    window.setTimeout(() => setIpamAdded((cur) => (cur === host.ip ? null : cur)), 2500);
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="vo-tool-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-[var(--vo-fg)]">
          <Radar className="h-5 w-5 shrink-0 text-[var(--vo-accent)]" aria-hidden />
          <h2 className="text-base font-semibold sm:text-lg">Sken lokalne mreže (LAN)</h2>
        </div>
        {localIp ? (
          <span className="w-fit rounded-full border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-3 py-1 font-mono text-xs text-[var(--vo-muted)]">
            Vaš IP: {localIp}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--vo-muted)]">
        {isMobile
          ? "Na telefonu odprite portal prek Wi‑Fi (ne mobilnih podatkov). Sken poteka v brskalniku — oblak vaše LAN ne vidi."
          : "Sken deluje v brskalniku na isti Wi‑Fi / LAN kot kamere. Strežnik v oblaku lokalne mreže ne skenira."}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={detecting || scanning}
          onClick={() => void detectNetwork()}
          className="vo-touch-btn vo-btn-secondary w-full sm:w-auto"
        >
          {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
          Zaznaj mojo mrežo
        </button>
        {localIp ? (
          <>
            <button
              type="button"
              disabled={scanning}
              onClick={applyQuickRange}
              className="vo-touch-btn vo-btn-secondary w-full sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              Hitri obseg (.1–.64)
            </button>
            <button
              type="button"
              disabled={scanning}
              onClick={applyFullRange}
              className="vo-touch-btn vo-btn-secondary w-full sm:w-auto"
            >
              Cel podomrežje /24
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--vo-muted)]">Začetni IP</span>
          <input
            value={startIp}
            onChange={(e) => setStartIp(e.target.value)}
            disabled={scanning}
            inputMode="decimal"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="vo-input vo-input-touch mt-1 w-full font-mono"
            placeholder="192.168.1.1"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--vo-muted)]">Končni IP</span>
          <input
            value={endIp}
            onChange={(e) => setEndIp(e.target.value)}
            disabled={scanning}
            inputMode="decimal"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="vo-input vo-input-touch mt-1 w-full font-mono"
            placeholder="192.168.1.254"
          />
        </label>
      </div>

      {isMobile ? (
        <p className="mt-2 text-xs text-[var(--vo-muted)]">
          Priporočeno na telefonu: hitri obseg ali do {profile.maxHosts} naslovov na sken.
        </p>
      ) : null}

      <div className="vo-sticky-actions flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={scanning}
          onClick={() => void runScan()}
          className="vo-touch-btn vo-btn-primary inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 sm:w-auto"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {scanning ? "Skeniram…" : "Zaženi sken mreže"}
        </button>
        {scanning ? (
          <button type="button" onClick={stopScan} className="vo-touch-btn vo-btn-secondary w-full sm:w-auto">
            <StopCircle className="h-4 w-4" />
            Ustavi
          </button>
        ) : null}
      </div>

      {scanning ? (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex justify-between text-xs text-[var(--vo-muted)]">
            <span>
              {progress.done} / {progress.total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--vo-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--vo-accent)] transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {rangeWarning ? <p className="vo-alert-warn mt-4 text-sm">{rangeWarning}</p> : null}
      {error ? (
        <p className="vo-alert-error mt-4 flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      {ipamAdded ? (
        <p className="vo-alert-info mt-3 text-sm">Dodano v IPAM: {ipamAdded}</p>
      ) : null}

      {!scanning && results.length === 0 && !error ? (
        <p className="mt-4 text-sm text-[var(--vo-muted)]">
          Po skenu se prikažejo naprave z odzivom na HTTP/RTSP vrata. MAC naslovov brskalnik ne prebere.
        </p>
      ) : null}

      {results.length > 0 ? (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {results.map((r) => (
              <ScanResultCard
                key={r.ip}
                host={r}
                onAdd={onAddToIpam ? () => addToIpam(r) : undefined}
              />
            ))}
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--vo-border)] md:block">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
                <tr>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Vrata</th>
                  <th className="px-3 py-2">Tip</th>
                  <th className="px-3 py-2">ms</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.ip} className="border-b border-[var(--vo-border)]">
                    <td className="px-3 py-2 font-mono">{r.ip}</td>
                    <td className="px-3 py-2 font-mono text-[var(--vo-muted)]">
                      {r.openPorts.length > 0 ? r.openPorts.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2">{r.deviceHint}</td>
                    <td className="px-3 py-2 text-[var(--vo-muted)]">{r.latencyMs}</td>
                    <td className="px-3 py-2 text-right">
                      {onAddToIpam ? (
                        <button
                          type="button"
                          className="text-[var(--vo-accent)] hover:underline"
                          onClick={() => addToIpam(r)}
                        >
                          + IPAM
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--vo-muted)]">Najdenih naprav: {results.length}</p>
        </>
      ) : null}

      {!scanning && progress.total > 0 && results.length === 0 ? (
        <p className="vo-alert-info mt-4 text-sm">
          Ni odzivnih naprav. Izklopite VPN, preverite Wi‑Fi ali zožite obseg (npr. .100–.120).
        </p>
      ) : null}
    </section>
  );
}
