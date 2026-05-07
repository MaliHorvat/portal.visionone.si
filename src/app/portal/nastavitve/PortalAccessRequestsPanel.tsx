"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PortalRole } from "@/context/PortalRoleContext";

type RequestRow = {
  id: string;
  clerkUserId: string;
  clerkEmail: string;
  clerkName: string;
  status: "new" | "approved" | "rejected";
  requestedAt: string;
  processedAt: string | null;
  processedBy: string;
  portalUser: null | { id: string; username: string; role: PortalRole };
};

export function PortalAccessRequestsPanel() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [busyId, setBusyId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, { username: string; password: string; role: PortalRole }>>({});

  const refresh = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/portal-access-requests");
    const data = (await res.json().catch(() => ({}))) as { error?: string; requests?: RequestRow[] };
    if (!res.ok) {
      setRows([]);
      setLoadError(data.error ?? "Napaka pri nalaganju zahtevkov.");
      return;
    }
    setRows(data.requests ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending = useMemo(() => rows.filter((r) => r.status === "new"), [rows]);

  async function setStatus(id: string, status: "new" | "approved" | "rejected") {
    setBusyId(id);
    const res = await fetch("/api/portal-access-requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusyId("");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg((data as { error?: string }).error ?? "Posodobitev ni uspela.");
      return;
    }
    setMsg("Status zahtevka je posodobljen.");
    await refresh();
  }

  async function createUser(id: string) {
    const s = form[id];
    if (!s) return;
    setBusyId(id);
    const res = await fetch("/api/portal-access-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId: id,
        username: s.username,
        password: s.password,
        role: s.role,
      }),
    });
    setBusyId("");
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Ustvarjanje uporabnika ni uspelo.");
      return;
    }
    setMsg("Uporabnik je ustvarjen.");
    await refresh();
  }

  function updateForm(id: string, patch: Partial<{ username: string; password: string; role: PortalRole }>) {
    setForm((prev) => ({
      ...prev,
      [id]: {
        username: prev[id]?.username ?? "",
        password: prev[id]?.password ?? "",
        role: prev[id]?.role ?? "viewer",
        ...patch,
      },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)] md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--vo-fg)]">Zahtevki za dostop</h2>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Clerk prijave, ki čakajo na ročno ustvarjanje portalnega uporabnika.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</div>
      ) : null}
      {msg ? <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-3 py-2 text-sm">{msg}</div> : null}

      <div className="text-sm text-[var(--vo-muted)]">
        Odprtih zahtevkov: <span className="font-semibold text-[var(--vo-fg)]">{pending.length}</span>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-[var(--vo-muted)]">Ni zahtevkov.</p> : null}
        {rows.map((r) => {
          const f = form[r.id] ?? { username: "", password: "", role: "viewer" as PortalRole };
          return (
            <div key={r.id} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--vo-fg)]">{r.clerkName || r.clerkEmail || r.clerkUserId}</p>
                <span className="text-xs text-[var(--vo-muted)]">
                  {new Date(r.requestedAt).toLocaleString("sl-SI")} · {r.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--vo-muted)]">Email: {r.clerkEmail || "—"}</p>
              {r.portalUser ? (
                <p className="mt-1 text-xs text-[var(--vo-muted)]">
                  Portal user: {r.portalUser.username} ({r.portalUser.role})
                </p>
              ) : null}

              {r.status === "new" ? (
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <input
                    placeholder="username"
                    value={f.username}
                    onChange={(e) => updateForm(r.id, { username: e.target.value })}
                    className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="začasno geslo"
                    type="password"
                    value={f.password}
                    onChange={(e) => updateForm(r.id, { password: e.target.value })}
                    className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-sm"
                  />
                  <select
                    value={f.role}
                    onChange={(e) => updateForm(r.id, { role: e.target.value as PortalRole })}
                    className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-sm"
                  >
                    <option value="viewer">Pregled</option>
                    <option value="operator">Operater</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void createUser(r.id)}
                    disabled={busyId === r.id || !f.username || !f.password}
                    className="rounded-lg bg-[var(--vo-accent)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Ustvari uporabnika
                  </button>
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, "new")}
                  disabled={busyId === r.id}
                  className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs"
                >
                  NEW
                </button>
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, "approved")}
                  disabled={busyId === r.id}
                  className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs"
                >
                  APPROVED
                </button>
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, "rejected")}
                  disabled={busyId === r.id}
                  className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs text-red-600"
                >
                  REJECT
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
