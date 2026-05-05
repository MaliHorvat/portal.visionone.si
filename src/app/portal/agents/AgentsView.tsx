"use client";

import { useEffect, useState } from "react";
import type { ClientSummary } from "@/lib/types";

type AgentRow = {
  id: string;
  externalId: string;
  name: string;
  siteLabel: string;
  clientId: string | null;
  lastSeenAt: string | null;
  client: { id: string; name: string } | null;
};

export function AgentsView({
  clients,
  dbConfigured,
}: {
  clients: ClientSummary[];
  dbConfigured: boolean;
}) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [externalId, setExternalId] = useState("");
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [siteLabel, setSiteLabel] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telemetry/agents", { credentials: "include" });
      const data = (await res.json()) as { agents?: AgentRow[]; error?: string };
      if (!res.ok) {
        setError(data?.error ?? "Napaka pri branju agentov.");
        return;
      }
      setAgents(data.agents ?? []);
    } catch {
      setError("Povezava ni uspela.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(null);
    setError(null);
    try {
      const res = await fetch("/api/telemetry/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId,
          clientId,
          name: name || externalId,
          siteLabel,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data?.error ?? "Shranjevanje ni uspelo.");
        return;
      }
      setSaved("Agent shranjen.");
      setExternalId("");
      setClientId("");
      setName("");
      setSiteLabel("");
      await refresh();
    } catch {
      setError("Povezava ni uspela.");
    }
  }

  if (!dbConfigured) {
    return (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6">
        <p className="text-sm text-[var(--vo-muted)]">Baza ni nastavljena (DATABASE_URL).</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Agenti (Edge)</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Registriraj <span className="font-medium text-[var(--vo-fg)]">agent_id</span> (npr.{" "}
          <code className="rounded bg-[var(--vo-surface-2)] px-1">rpi-&lt;serial&gt;</code>) in ga dodeli
          stranki. Naprave se preberejo iz zapisov kamer / snemalnikov / switchov za to stranko.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
      >
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Nov ali obstoječ agent</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Agent ID (externalId)</span>
            <input
              required
              value={externalId}
              onChange={(ev) => setExternalId(ev.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
              placeholder="rpi-e661xxxxxxxxxxxx"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Stranka</span>
            <select
              required
              value={clientId}
              onChange={(ev) => setClientId(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
            >
              <option value="">Izberi…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Ime agenta (opcijsko)</span>
            <input
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
              placeholder="RB pri stranki Logatec"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Oznaka objekta (opcijsko)</span>
            <input
              value={siteLabel}
              onChange={(ev) => setSiteLabel(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
              placeholder="Objekt …"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
        >
          Shrani agenta
        </button>
        {saved ? <p className="mt-3 text-sm text-[var(--vo-ok)]">{saved}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-[var(--vo-danger)]">{error}</p>
        ) : null}
      </form>

      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Registrirani agenti</h2>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs font-medium text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
          >
            Osveži
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--vo-muted)]">Nalaganje…</p>
        ) : agents.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--vo-muted)]">Ni registriranih agentov.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--vo-border)] text-[var(--vo-muted)]">
                  <th className="py-2 pr-4 font-medium">Agent ID</th>
                  <th className="py-2 pr-4 font-medium">Stranka</th>
                  <th className="py-2 pr-4 font-medium">Zadnji kontakt</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--vo-border)]">
                    <td className="py-2 pr-4 font-mono text-[var(--vo-fg)]">{a.externalId}</td>
                    <td className="py-2 pr-4 text-[var(--vo-fg)]">{a.client?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-[var(--vo-muted)]">
                      {a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString("sl-SI") : "nikoli"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Raspberry Pi — izpis serial</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--vo-bg)] p-3 text-xs text-[var(--vo-fg)]">
          cat /proc/cpuinfo | grep Serial
        </pre>
        <p className="mt-2 text-xs text-[var(--vo-muted)]">
          Agent lahko uporablja <code className="rounded bg-[var(--vo-surface-2)] px-1">agent_id: AUTO</code> —
          takrat je ID <code className="rounded bg-[var(--vo-surface-2)] px-1">rpi-&lt;serial&gt;</code>. Ta isti ID
          mora biti vpisan tukaj.
        </p>
      </div>
    </div>
  );
}
