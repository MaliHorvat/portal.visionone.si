"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, RefreshCw } from "lucide-react";
import { AdminGate } from "@/components/portal/AdminGate";

type DefRow = { manufacturer: string; mainStream: string; subStream: string };

type PreviewCamera = {
  id: string;
  name: string;
  tag: string;
  ip: string;
  model: string;
  rtspUser: string;
  hasPass: boolean;
  manufacturer: string | null;
  mainUrl: string;
  subUrl: string;
};

type PreviewClient = {
  clientId: string;
  clientName: string;
  slug: string | null;
  cameras: PreviewCamera[];
};

export default function KameraDefinicijePage() {
  const [rows, setRows] = useState<DefRow[]>([]);
  const [clients, setClients] = useState<PreviewClient[]>([]);
  const [manufacturer, setManufacturer] = useState("");
  const [mainStream, setMainStream] = useState("");
  const [subStream, setSubStream] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [showClients, setShowClients] = useState(true);

  const load = useCallback(async () => {
    const [defRes, prevRes] = await Promise.all([
      fetch("/api/camera-definitions", { credentials: "include" }),
      fetch("/api/camera-definitions/preview", { credentials: "include" }),
    ]);
    const defData = (await defRes.json()) as { definitions?: DefRow[] };
    setRows(defData.definitions ?? []);
    if (prevRes.ok) {
      const prev = (await prevRes.json()) as { clients?: PreviewClient[] };
      setClients(prev.clients ?? []);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (loading || rows.length > 0) return;
    void seedStandard(false);
  }, [loading, rows.length]);

  async function seedStandard(manual: boolean) {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/camera-definitions/seed", {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as { upserted?: number; error?: string };
      if (!res.ok) {
        setSeedMsg(j.error ?? "Nalaganje predlog ni uspelo.");
        return;
      }
      setSeedMsg(
        manual
          ? `Posodobljenih ${j.upserted ?? 0} standardnih predlog.`
          : `V bazo dodanih/posodobljenih ${j.upserted ?? 0} RTSP predlog.`,
      );
      await load();
    } finally {
      setSeeding(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/camera-definitions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manufacturer, mainStream, subStream }),
    });
    setManufacturer("");
    setMainStream("");
    setSubStream("");
    await load();
  }

  async function del(m: string) {
    if (!confirm(`Izbrisati ${m}?`)) return;
    await fetch(`/api/camera-definitions?manufacturer=${encodeURIComponent(m)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  const totalCameras = clients.reduce((n, c) => n + c.cameras.length, 0);

  return (
    <AdminGate>
      <div className="space-y-8 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="vo-page-title text-xl sm:text-2xl">RTSP definicije</h1>
            <p className="vo-page-desc mt-1 text-sm">
              Predloge main/sub stream poti po proizvajalcu. Spodaj: vse stranke in sestavljeni RTSP URL z uporabnikom/geslom
              iz kamer.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void seedStandard(true)}
            className="vo-touch-btn vo-btn-secondary inline-flex items-center gap-2"
          >
            {seeding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Naloži standardne predloge
          </button>
        </div>

        {seedMsg ? <p className="vo-alert-info text-sm">{seedMsg}</p> : null}

        <form
          onSubmit={save}
          className="vo-tool-section grid grid-cols-1 gap-3 md:grid-cols-4"
        >
          <label className="text-sm md:col-span-1">
            <span className="vo-field-label">Proizvajalec</span>
            <input
              required
              placeholder="npr. Dahua"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full"
            />
          </label>
          <label className="text-sm md:col-span-1">
            <span className="vo-field-label">Main stream (pot)</span>
            <input
              placeholder="/cam/realmonitor?channel={channel}&subtype=0"
              value={mainStream}
              onChange={(e) => setMainStream(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full font-mono text-xs"
            />
          </label>
          <label className="text-sm md:col-span-1">
            <span className="vo-field-label">Sub stream (pot)</span>
            <input
              placeholder="/cam/realmonitor?channel={channel}&subtype=1"
              value={subStream}
              onChange={(e) => setSubStream(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full font-mono text-xs"
            />
          </label>
          <button type="submit" className="vo-touch-btn vo-btn-primary mt-6 md:col-span-1 md:mt-auto">
            Shrani
          </button>
        </form>

        <p className="text-xs text-[var(--vo-muted)]">
          Placeholderji v poti: <code className="font-mono">{"{channel}"}</code>,{" "}
          <code className="font-mono">{"{channel01}"}</code> (Hikvision 101/102),{" "}
          <code className="font-mono">{"{channelPadded}"}</code> (Reolink 01).
        </p>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-4 py-2">Proizvajalec</th>
                <th className="px-4 py-2">Main</th>
                <th className="px-4 py-2">Sub</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--vo-muted)]">
                    Nalagam…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.manufacturer} className="border-t border-[var(--vo-border)]">
                    <td className="px-4 py-2 font-medium">{r.manufacturer}</td>
                    <td className="max-w-[280px] truncate px-4 py-2 font-mono text-xs" title={r.mainStream}>
                      {r.mainStream || "—"}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-2 font-mono text-xs" title={r.subStream}>
                      {r.subStream || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-[var(--vo-danger)] hover:underline"
                        onClick={() => void del(r.manufacturer)}
                      >
                        Briši
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--vo-muted)]">
                    Ni definicij — predloge se nalagajo samodejno.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--vo-fg)]">
              Stranke in kamere ({clients.length} strank, {totalCameras} kamer)
            </h2>
            <button
              type="button"
              className="text-sm text-[var(--vo-accent)] hover:underline"
              onClick={() => setShowClients((v) => !v)}
            >
              {showClients ? "Skrij" : "Prikaži"}
            </button>
          </div>
          <p className="text-xs text-[var(--vo-muted)]">
            Proizvajalec se ujema po polju model kamere. Uporabnik/geslo iz zapisa kamere pri stranki.
          </p>

          {showClients ? (
            <div className="space-y-4">
              {clients.length === 0 ? (
                <p className="text-sm text-[var(--vo-muted)]">Ni strank ali kamer.</p>
              ) : null}
              {clients.map((client) => (
                <div
                  key={client.clientId}
                  className="overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-2">
                    <Link
                      href={`/portal/stranke/${client.slug || client.clientId}?tab=kamere`}
                      className="font-semibold text-[var(--vo-accent)] hover:underline"
                    >
                      {client.clientName}
                    </Link>
                    <span className="text-xs text-[var(--vo-muted)]">{client.cameras.length} kamer</span>
                  </div>
                  {client.cameras.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[var(--vo-muted)]">Brez kamer.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full text-left text-xs">
                        <thead className="text-[var(--vo-muted)]">
                          <tr>
                            <th className="px-3 py-2">Kamera</th>
                            <th className="px-3 py-2">IP</th>
                            <th className="px-3 py-2">Model</th>
                            <th className="px-3 py-2">Predloga</th>
                            <th className="px-3 py-2">Uporabnik</th>
                            <th className="px-3 py-2">Main RTSP</th>
                            <th className="px-3 py-2">Sub RTSP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {client.cameras.map((cam) => (
                            <tr key={cam.id} className="border-t border-[var(--vo-border)]">
                              <td className="px-3 py-2 font-medium text-[var(--vo-fg)]">
                                {cam.tag ? `${cam.tag} · ` : ""}
                                {cam.name}
                              </td>
                              <td className="px-3 py-2 font-mono">{cam.ip || "—"}</td>
                              <td className="px-3 py-2 text-[var(--vo-muted)]">{cam.model || "—"}</td>
                              <td className="px-3 py-2">{cam.manufacturer ?? "—"}</td>
                              <td className="px-3 py-2">
                                {cam.rtspUser || "—"} / {cam.hasPass ? "••••" : "—"}
                              </td>
                              <td className="max-w-[220px] truncate px-3 py-2 font-mono" title={cam.mainUrl}>
                                {cam.mainUrl || "—"}
                              </td>
                              <td className="max-w-[220px] truncate px-3 py-2 font-mono" title={cam.subUrl}>
                                {cam.subUrl || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </AdminGate>
  );
}
