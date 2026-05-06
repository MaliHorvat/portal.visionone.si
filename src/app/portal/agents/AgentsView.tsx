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
  configVersion: number;
  lastError: string;
  client: { id: string; name: string } | null;
};

type ClaimRow = {
  id: string;
  code: string;
  externalId: string;
  name: string;
  siteLabel: string;
  expiresAt: string;
  consumedAt: string | null;
  client: { id: string; name: string };
};

type JobRow = {
  id: string;
  type: "ping" | "scan";
  status: "pending" | "running" | "done" | "error";
  createdAt: string;
  errorText: string;
  agent: { id: string; externalId: string; name: string };
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
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const [externalId, setExternalId] = useState("");
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [claimClientId, setClaimClientId] = useState("");
  const [claimExternalId, setClaimExternalId] = useState("AUTO");
  const [claimName, setClaimName] = useState("");
  const [claimSiteLabel, setClaimSiteLabel] = useState("");
  const [latestClaim, setLatestClaim] = useState<string | null>(null);

  const [jobAgentId, setJobAgentId] = useState("");
  const [jobType, setJobType] = useState<"ping" | "scan">("ping");
  const [jobIp, setJobIp] = useState("");
  const [jobPort, setJobPort] = useState(80);
  const [scanPrefix, setScanPrefix] = useState("192.168.1");
  const [scanStart, setScanStart] = useState(1);
  const [scanEnd, setScanEnd] = useState(40);

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
      const cRes = await fetch("/api/telemetry/claims", { credentials: "include" });
      const cData = (await cRes.json().catch(() => ({}))) as { claims?: ClaimRow[] };
      if (cRes.ok) setClaims(cData.claims ?? []);

      const jRes = await fetch("/api/telemetry/jobs?take=25", { credentials: "include" });
      const jData = (await jRes.json().catch(() => ({}))) as { jobs?: JobRow[] };
      if (jRes.ok) setJobs(jData.jobs ?? []);
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

  async function onCreateClaim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setLatestClaim(null);
    const useAuto = claimExternalId.trim().toUpperCase() === "AUTO";
    const generatedExternalId = useAuto ? `rpi-claim-${Date.now().toString(36)}` : claimExternalId.trim();
    const res = await fetch("/api/telemetry/claims", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: claimClientId,
        externalId: generatedExternalId,
        name: claimName || generatedExternalId,
        siteLabel: claimSiteLabel,
        ttlMinutes: 60,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; claim?: ClaimRow };
    if (!res.ok) {
      setError(data?.error ?? "Generiranje claim kode ni uspelo.");
      return;
    }
    setLatestClaim(data.claim?.code ?? null);
    setSaved("Claim koda ustvarjena.");
    await refresh();
  }

  async function onCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    if (jobType === "ping") {
      payload = { ip: jobIp.trim(), port: jobPort };
    } else {
      payload = { prefix: scanPrefix.trim(), start: scanStart, end: scanEnd, port: jobPort };
    }
    const res = await fetch("/api/telemetry/jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: jobAgentId, type: jobType, payload }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data?.error ?? "Kreiranje opravila ni uspelo.");
      return;
    }
    setSaved("Opravilo poslano agentu.");
    await refresh();
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

      <form
        onSubmit={onCreateClaim}
        className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
      >
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zero-touch claim code (SD image)</h2>
        <p className="mt-1 text-xs text-[var(--vo-muted)]">
          Na RPi vpišite datoteko <code>/boot/visionone-claim.txt</code> z <code>portal_base_url</code> in
          <code> claim_code</code>. Bootstrap service sam prevzame konfiguracijo.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Stranka</span>
            <select
              required
              value={claimClientId}
              onChange={(ev) => setClaimClientId(ev.target.value)}
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
            <span className="text-[var(--vo-muted)]">External ID</span>
            <input
              value={claimExternalId}
              onChange={(ev) => setClaimExternalId(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
              placeholder="AUTO ali rpi-serial"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Ime (opcijsko)</span>
            <input
              value={claimName}
              onChange={(ev) => setClaimName(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Oznaka lokacije</span>
            <input
              value={claimSiteLabel}
              onChange={(ev) => setClaimSiteLabel(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-[var(--vo-fg)]"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
        >
          Generiraj claim kodo
        </button>
        {latestClaim ? (
          <div className="mt-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3 text-sm">
            <p className="text-[var(--vo-muted)]">Claim code:</p>
            <p className="font-mono text-lg text-[var(--vo-fg)]">{latestClaim}</p>
          </div>
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
                  <th className="py-2 pr-4 font-medium">Cfg v.</th>
                  <th className="py-2 pr-4 font-medium">Zadnji kontakt</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--vo-border)]">
                    <td className="py-2 pr-4 font-mono text-[var(--vo-fg)]">{a.externalId}</td>
                    <td className="py-2 pr-4 text-[var(--vo-fg)]">{a.client?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-[var(--vo-muted)]">{a.configVersion ?? 1}</td>
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

      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zadnje claim kode</h2>
        {claims.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--vo-muted)]">Ni claim kod.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--vo-border)] text-[var(--vo-muted)]">
                  <th className="py-2 pr-4 font-medium">Koda</th>
                  <th className="py-2 pr-4 font-medium">External ID</th>
                  <th className="py-2 pr-4 font-medium">Stranka</th>
                  <th className="py-2 pr-4 font-medium">Velja do</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--vo-border)]">
                    <td className="py-2 pr-4 font-mono text-[var(--vo-fg)]">{c.code}</td>
                    <td className="py-2 pr-4">{c.externalId}</td>
                    <td className="py-2 pr-4">{c.client.name}</td>
                    <td className="py-2 pr-4 text-[var(--vo-muted)]">{new Date(c.expiresAt).toLocaleString("sl-SI")}</td>
                    <td className="py-2 pr-4">{c.consumedAt ? "porabljena" : "aktivna"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form
        onSubmit={onCreateJob}
        className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
      >
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Ping / scan opravila (lokalno prek agenta)</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <select
            required
            value={jobAgentId}
            onChange={(ev) => setJobAgentId(ev.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
          >
            <option value="">Izberi agenta…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.externalId} ({a.client?.name ?? "—"})
              </option>
            ))}
          </select>
          <select
            value={jobType}
            onChange={(ev) => setJobType(ev.target.value as "ping" | "scan")}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
          >
            <option value="ping">Ping (TCP)</option>
            <option value="scan">Scan subnet</option>
          </select>
          <input
            type="number"
            value={jobPort}
            onChange={(ev) => setJobPort(Number(ev.target.value) || 80)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            placeholder="Port"
          />
          {jobType === "ping" ? (
            <input
              value={jobIp}
              onChange={(ev) => setJobIp(ev.target.value)}
              className="md:col-span-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
              placeholder="IP (npr. 192.168.1.10)"
            />
          ) : (
            <>
              <input
                value={scanPrefix}
                onChange={(ev) => setScanPrefix(ev.target.value)}
                className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
                placeholder="Prefix (npr. 192.168.1)"
              />
              <input
                type="number"
                value={scanStart}
                onChange={(ev) => setScanStart(Number(ev.target.value) || 1)}
                className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
                placeholder="Start"
              />
              <input
                type="number"
                value={scanEnd}
                onChange={(ev) => setScanEnd(Number(ev.target.value) || 40)}
                className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
                placeholder="End"
              />
            </>
          )}
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
        >
          Pošlji opravilo
        </button>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--vo-border)] text-[var(--vo-muted)]">
                <th className="py-2 pr-4 font-medium">Čas</th>
                <th className="py-2 pr-4 font-medium">Agent</th>
                <th className="py-2 pr-4 font-medium">Tip</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Napaka</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-[var(--vo-border)]">
                  <td className="py-2 pr-4 text-[var(--vo-muted)]">{new Date(j.createdAt).toLocaleString("sl-SI")}</td>
                  <td className="py-2 pr-4 font-mono text-[var(--vo-fg)]">{j.agent.externalId}</td>
                  <td className="py-2 pr-4 text-[var(--vo-fg)]">{j.type}</td>
                  <td className="py-2 pr-4 text-[var(--vo-fg)]">{j.status}</td>
                  <td className="py-2 pr-4 text-[var(--vo-danger)]">{j.errorText || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

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
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--vo-bg)] p-3 text-xs text-[var(--vo-fg)]">
{`portal_base_url=https://portal.visionone.si
claim_code=VO-XXXXX-XXXXX
agent_name=RB-Lokacija`}
        </pre>
      </div>
    </div>
  );
}
