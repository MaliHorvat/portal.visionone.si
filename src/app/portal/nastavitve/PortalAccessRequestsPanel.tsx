"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PortalRole } from "@/context/PortalRoleContext";

type RequestStatus = "new" | "approved" | "rejected" | "ignored";

type RequestRow = {
  id: string;
  clerkUserId: string;
  clerkEmail: string;
  clerkName: string;
  status: RequestStatus;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string;
  portalUser: null | { id: string; username: string; role: PortalRole };
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Odprt",
  approved: "Odobren",
  rejected: "Zavrnjen",
  ignored: "Ignoriran",
};

type ListFilter = "open" | "all";

export function PortalAccessRequestsPanel() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [busyId, setBusyId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>("open");
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

  const visibleRows = useMemo(() => {
    if (listFilter === "all") return rows;
    return rows.filter((r) => r.status === "new");
  }, [rows, listFilter]);

  async function setStatus(id: string, status: RequestStatus) {
    setBusyId(id);
    setMsg(null);
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
    setMsg(status === "ignored" ? "Zahtevek je označen kot ignoriran." : "Status zahtevka je posodobljen.");
    await refresh();
  }

  async function deleteRequest(id: string, label: string) {
    if (!confirm(`Trajno izbrisati zahtevek (${label})?`)) return;
    setBusyId(id);
    setMsg(null);
    const res = await fetch(`/api/portal-access-requests?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setBusyId("");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg((data as { error?: string }).error ?? "Brisanje ni uspelo.");
      return;
    }
    setMsg("Zahtevek je izbrisan.");
    await refresh();
  }

  async function createUser(id: string) {
    const s = form[id];
    if (!s) return;
    setBusyId(id);
    setMsg(null);
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--vo-muted)]">
          Odprtih zahtevkov: <span className="font-semibold text-[var(--vo-fg)]">{pending.length}</span>
        </p>
        <div className="flex rounded-lg border border-[var(--vo-border)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setListFilter("open")}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              listFilter === "open"
                ? "bg-[var(--vo-accent)] text-white"
                : "text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
            }`}
          >
            Samo odprti
          </button>
          <button
            type="button"
            onClick={() => setListFilter("all")}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              listFilter === "all"
                ? "bg-[var(--vo-accent)] text-white"
                : "text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
            }`}
          >
            Vsi ({rows.length})
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visibleRows.length === 0 ? (
          <p className="text-sm text-[var(--vo-muted)]">
            {listFilter === "open" ? "Ni odprtih zahtevkov." : "Ni zahtevkov."}
          </p>
        ) : null}
        {visibleRows.map((r) => {
          const f = form[r.id] ?? { username: "", password: "", role: "viewer" as PortalRole };
          const displayName = r.clerkName || r.clerkEmail || r.clerkUserId;
          return (
            <div key={r.id} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--vo-fg)]">{displayName}</p>
                <span className="text-xs text-[var(--vo-muted)]">
                  {new Date(r.requestedAt).toLocaleString("sl-SI")} · {STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--vo-muted)]">E-pošta: {r.clerkEmail || "—"}</p>
              {r.portalUser ? (
                <p className="mt-1 text-xs text-[var(--vo-muted)]">
                  Portalni uporabnik: {r.portalUser.username} ({r.portalUser.role})
                </p>
              ) : null}

              {r.status === "new" ? (
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <input
                    placeholder="uporabniško ime"
                    value={f.username}
                    onChange={(e) => updateForm(r.id, { username: e.target.value })}
                    className="vo-input px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="začasno geslo"
                    type="password"
                    value={f.password}
                    onChange={(e) => updateForm(r.id, { password: e.target.value })}
                    className="vo-input px-2 py-1.5 text-sm"
                  />
                  <select
                    value={f.role}
                    onChange={(e) => updateForm(r.id, { role: e.target.value as PortalRole })}
                    className="vo-input px-2 py-1.5 text-sm"
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

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "new" ? (
                  <button
                    type="button"
                    onClick={() => void setStatus(r.id, "new")}
                    disabled={busyId === r.id}
                    className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs hover:bg-[var(--vo-surface-2)]"
                  >
                    Ponovno odpri
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, "approved")}
                  disabled={busyId === r.id}
                  className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs hover:bg-[var(--vo-surface-2)]"
                >
                  Odobri
                </button>
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, "rejected")}
                  disabled={busyId === r.id}
                  className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10"
                >
                  Zavrni
                </button>
                {r.status !== "ignored" ? (
                  <button
                    type="button"
                    onClick={() => void setStatus(r.id, "ignored")}
                    disabled={busyId === r.id}
                    className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
                  >
                    Ignoriraj
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void deleteRequest(r.id, displayName)}
                  disabled={busyId === r.id}
                  className="rounded border border-[var(--vo-danger)]/50 px-2 py-1 text-xs text-[var(--vo-danger)] hover:bg-[var(--vo-danger)]/10"
                >
                  Izbriši
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
