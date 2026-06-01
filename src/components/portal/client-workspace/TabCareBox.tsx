"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  ExternalLink,
  RefreshCw,
  Shield,
  RadioTower,
} from "lucide-react";
import { CARE_SLA_OPTIONS } from "@/lib/care-box";
import { usePortalToast } from "@/context/PortalToastContext";
import type { ClientCareBoxStatusDto } from "@/lib/repositories/care-box";
import type { WorkspaceCtx } from "./types";

export function TabCareBox({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured } = ctx;
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClientCareBoxStatusDto | null>(null);
  const [slaTier, setSlaTier] = useState("");
  const [remoteNotes, setRemoteNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!dbConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/care-box`, {
        credentials: "include",
      });
      const j = (await res.json()) as ClientCareBoxStatusDto & { error?: string };
      if (!res.ok) {
        showToast(j.error ?? "Napaka pri branju statusa.", "err");
        return;
      }
      setStatus(j);
      setSlaTier(j.careSlaTier ?? "");
      setRemoteNotes(j.careRemoteNotes ?? "");
    } catch {
      showToast("Povezava ni uspela.", "err");
    } finally {
      setLoading(false);
    }
  }, [clientId, dbConfigured, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadBundle() {
    if (!dbConfigured) {
      showToast("Baza ni nastavljena.", "err");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/care-box-bundle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(j.error ?? "Generiranje paketa ni uspelo.", "err");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `visionone-care-box-${client.slug ?? clientId}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Care Box paket je prenesen (za monterja).");
      void load();
    } catch {
      showToast("Prenos ni uspel.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/care-box`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careBoxEnabled: true,
          careSlaTier: slaTier,
          careRemoteNotes: remoteNotes,
        }),
      });
      const j = (await res.json()) as ClientCareBoxStatusDto & { error?: string };
      if (!res.ok) {
        showToast(j.error ?? "Shranjevanje ni uspelo.", "err");
        return;
      }
      setStatus(j);
      showToast("Nastavitve Care Box shranjene.");
    } catch {
      showToast("Shranjevanje ni uspelo.", "err");
    } finally {
      setSaving(false);
    }
  }

  const agent = status?.agents[0];
  const online = status?.summary.online ?? false;

  return (
    <div className="space-y-6">
      <div className="vo-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              online ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]" : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
            }`}
          >
            <RadioTower className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--vo-fg)]">VisionOne Care Box</h2>
            <p className="mt-1 text-sm text-[var(--vo-muted)]">
              Monitoring in 24/7 oddaljena podpora za <strong className="text-[var(--vo-fg)]">{client.name}</strong>.
              Stranka ne upravlja naprave — vi spremljate zdravje sistema in odreagirate ob incidentu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Osveži
            </button>
            <Link
              href="/portal/care-box"
              className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Vsi Care Box-i
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[var(--vo-muted)]">Nalagam status…</p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="vo-stat-tile p-4">
                <p className="text-xs text-[var(--vo-muted)]">Box / agent</p>
                <p className={`mt-1 text-lg font-bold ${online ? "text-[var(--vo-ok)]" : "text-[var(--vo-danger)]"}`}>
                  {agent ? (online ? "ONLINE" : "OFFLINE") : "Ni nameščen"}
                </p>
                {agent?.lastSeenAt ? (
                  <p className="mt-1 text-[10px] text-[var(--vo-muted)]">
                    Zadnji kontakt: {new Date(agent.lastSeenAt).toLocaleString("sl-SI")}
                  </p>
                ) : null}
              </div>
              <div className="vo-stat-tile p-4">
                <p className="text-xs text-[var(--vo-muted)]">Naprave (probe)</p>
                <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                  {status?.summary.devicesTotal ?? 0} skupaj
                </p>
                {(status?.summary.devicesOffline ?? 0) > 0 ? (
                  <p className="mt-1 text-xs text-[var(--vo-danger)]">
                    {status?.summary.devicesOffline} offline / alarm
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--vo-ok)]">Vse dosegljivo</p>
                )}
              </div>
              <div className="vo-stat-tile p-4">
                <p className="text-xs text-[var(--vo-muted)]">SLA paket</p>
                <p className="mt-1 text-lg font-semibold text-[var(--vo-accent)]">{status?.careSlaLabel ?? "—"}</p>
              </div>
            </div>

            {agent && !online ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Care Box ni dosegljiv. Preverite napajanje, LAN in internet na objektu.
                  {agent.lastError ? ` Napaka: ${agent.lastError}` : ""}
                </span>
              </div>
            ) : null}

            {agent && agent.devices.length > 0 ? (
              <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--vo-border)]">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-[var(--vo-surface-2)] text-xs text-[var(--vo-muted)]">
                    <tr>
                      <th className="px-3 py-2">Naprava</th>
                      <th className="px-3 py-2">IP</th>
                      <th className="px-3 py-2">Vrsta</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--vo-border)]">
                    {agent.devices.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 font-medium text-[var(--vo-fg)]">{d.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.ip}</td>
                        <td className="px-3 py-2 text-[var(--vo-muted)]">{d.kind}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              d.status === "online"
                                ? "text-[var(--vo-ok)]"
                                : d.status === "alarm"
                                  ? "text-[var(--vo-warn)]"
                                  : "text-[var(--vo-danger)]"
                            }
                          >
                            {d.status}
                            {d.latencyMs != null ? ` · ${d.latencyMs} ms` : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : agent ? (
              <p className="mt-4 text-sm text-[var(--vo-muted)]">
                Agent še nima naprav — preverite, da so na stranki vpisani IP-ji kamer/NVR/switch in da je agent osvežil
                konfiguracijo.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="vo-card p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--vo-fg)]">
          <Shield className="h-4 w-4 text-[var(--vo-accent)]" /> SLA in oddaljen dostop (interno)
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">SLA nivo</span>
            <select
              value={slaTier}
              onChange={(e) => setSlaTier(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
            >
              {CARE_SLA_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                  {o.hint ? ` — ${o.hint}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-[var(--vo-muted)]">Opombe za oddaljen dostop (tunnel, VPN, gesla — samo za ekipo)</span>
          <textarea
            value={remoteNotes}
            onChange={(e) => setRemoteNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-xs"
            placeholder="npr. Cloudflare tunnel ID, Tailscale IP, kontakt na lokaciji…"
          />
        </label>
        <button
          type="button"
          disabled={saving || !dbConfigured}
          onClick={() => void saveSettings()}
          className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Shranjujem…" : "Shrani nastavitve"}
        </button>
      </div>

      <div className="vo-card border-[var(--vo-accent)]/20 bg-[var(--vo-accent-muted)]/20 p-6">
        <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Priprava škatle (samo za monterja)</h3>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">
          Prenesite ZIP, pripravite SD kartico in jo vstavite v Raspberry Pi na objektu. Claim koda je že v datotekah —
          <strong className="text-[var(--vo-fg)]"> ne posredujte je stranki</strong>.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-[var(--vo-muted)]">
          <li>Pi OS na SD → kopirajte vse iz ZIP na boot particijo.</li>
          <li>Priklop na isto omrežje kot NVR.</li>
          <li>Po prijavi preverite zelen status zgoraj.</li>
        </ol>
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void downloadBundle()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--vo-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy ? "Pripravljam…" : "Prenesi Care Box paket (ZIP)"}
        </button>
        {agent?.pendingClaims.length ? (
          <p className="mt-3 text-xs text-[var(--vo-muted)]">
            Aktivna claim koda (interno):{" "}
            <code className="text-[var(--vo-fg)]">{agent.pendingClaims[0]?.code}</code>
          </p>
        ) : null}
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--vo-muted)]">
        <Activity className="h-3.5 w-3.5" />
        Ob spremembi statusa naprav pošlje Telegram, če imate nastavljena pravila v Obvestila.
      </p>
    </div>
  );
}
