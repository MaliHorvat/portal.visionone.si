"use client";

import { useState } from "react";
import { Scan, Wifi, Image as ImageIcon } from "lucide-react";

function mockScan(start: string, end: string) {
  const base = start.replace(/\.\d+$/, "");
  return [
    { ip: `${base}.1`, mac: "00:11:22:33:44:01", host: "router.gateway" },
    { ip: `${base}.10`, mac: "aa:bb:cc:dd:ee:ff", host: "nvr.local" },
    { ip: `${base}.50`, mac: "de:ad:be:ef:00:01", host: "cam-vhod" },
  ].filter(() => start && end);
}

export default function OrodjaPage() {
  const [startIp, setStartIp] = useState("192.168.1.1");
  const [endIp, setEndIp] = useState("192.168.1.30");
  const [scanResult, setScanResult] = useState<ReturnType<typeof mockScan>>([]);
  const [mac, setMac] = useState("aa:bb:cc:dd:ee:ff");
  const [wolMsg, setWolMsg] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Orodja in diagnostika</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          IP skeniranje, Wake-on-LAN in posnetek kamere — simulacija na frontendu; zamenjaj z Go
          API.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Scan className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">IP skeniranje</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Začetni IP</span>
              <input
                value={startIp}
                onChange={(e) => setStartIp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--vo-muted)]">Končni IP</span>
              <input
                value={endIp}
                onChange={(e) => setEndIp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setScanResult(mockScan(startIp, endIp))}
            className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
          >
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

        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <div className="flex items-center gap-2 text-[var(--vo-fg)]">
            <Wifi className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
            <h2 className="font-semibold">Wake-on-LAN</h2>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-[var(--vo-muted)]">MAC naslov</span>
            <input
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => setWolMsg(`Magic packet poslan na ${mac} (demo).`)}
            className="mt-4 rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm font-semibold text-[var(--vo-fg)] hover:bg-[var(--vo-surface-2)]"
          >
            Pošlji WoL
          </button>
          {wolMsg ? <p className="mt-3 text-sm text-[var(--vo-ok)]">{wolMsg}</p> : null}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
        <div className="flex items-center gap-2 text-[var(--vo-fg)]">
          <ImageIcon className="h-5 w-5 text-[var(--vo-accent)]" aria-hidden />
          <h2 className="font-semibold">Zadnji snapshot (kamera)</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">
          Mock slika — stream/GET thumbnail iz Go storitve.
        </p>
        <div className="mt-4 aspect-video max-w-xl overflow-hidden rounded-lg border border-[var(--vo-border)] bg-gradient-to-br from-slate-800 via-slate-700 to-teal-900">
          <div className="flex h-full items-center justify-center text-sm text-white/80">
            Snapshot placeholder
          </div>
        </div>
      </section>
    </div>
  );
}
