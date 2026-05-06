"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortalRole } from "@/context/PortalRoleContext";
import { roleLabel } from "@/lib/portal-roles";

type Row = { id: string; username: string; email: string; role: PortalRole; mustChangePassword: boolean };

export function NastavitveUporabniki() {
  const [users, setUsers] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PortalRole>("viewer");

  const refresh = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/portal-users");
    if (res.status === 503) {
      setUsers([]);
      setLoadError("Baza ni nastavljena — uporabnike lahko urejate, ko je DATABASE_URL aktiven in shema posodobljena.");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUsers([]);
      setLoadError(data?.error ?? "Napaka pri nalaganju.");
      return;
    }
    const data = (await res.json()) as { users: Row[] };
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const res = await fetch("/api/portal-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email, password, role }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("viewer");
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrisati tega uporabnika?")) return;
    setBusy(true);
    const res = await fetch(`/api/portal-users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Brisanje ni uspelo.");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-6 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)] md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--vo-fg)]">Portalni uporabniki</h2>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Administratorski račun je samo <code className="text-xs">admin</code> (geslo v bazi; seed / skrbnik). Tukaj
          lahko dodajate dodatne uporabnike in določite vlogo.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="grid gap-3 border-t border-[var(--vo-border)] pt-4 md:grid-cols-3">
        <div className="md:col-span-2 text-sm font-medium text-[var(--vo-fg)]">Nov uporabnik</div>
        <div />
        <input
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
          placeholder="Uporabniško ime"
          required
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="E-pošta (opcijsko)"
          type="email"
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          placeholder="Geslo (vsaj 8 znakov)"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(ev) => setRole(ev.target.value as PortalRole)}
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="viewer">Pregled</option>
          <option value="operator">Operater</option>
          <option value="admin">Administrator</option>
        </select>
        {formError ? <p className="text-sm text-red-700 md:col-span-3">{formError}</p> : null}
        <button
          type="submit"
          disabled={busy || !!loadError}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-3"
        >
          {busy ? "Shranjujem…" : "Dodaj uporabnika"}
        </button>
      </form>

      <div className="border-t border-[var(--vo-border)] pt-4">
        <p className="mb-2 text-sm font-medium text-[var(--vo-fg)]">Seznam</p>
        <div className="overflow-hidden rounded-lg border border-[var(--vo-border)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Uporabnik</th>
                <th className="px-3 py-2 font-medium">E-pošta</th>
                <th className="px-3 py-2 font-medium">Vloga</th>
                <th className="px-3 py-2 font-medium">Stanje</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--vo-muted)]">
                    Ni vpisanih uporabnikov v bazi.
                  </td>
                </tr>
              ) : null}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--vo-border)] last:border-0">
                  <td className="px-3 py-2 font-medium text-[var(--vo-fg)]">{u.username}</td>
                  <td className="px-3 py-2 text-[var(--vo-muted)]">{u.email || "—"}</td>
                  <td className="px-3 py-2 text-[var(--vo-muted)]">{roleLabel(u.role)}</td>
                  <td className="px-3 py-2 text-[var(--vo-muted)]">
                    {u.mustChangePassword ? "Čaka menjavo gesla" : "Aktiven"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {u.username === "admin" ? (
                      <span className="text-xs text-[var(--vo-muted)]">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !!loadError}
                        onClick={() => void handleDelete(u.id)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                      >
                        Izbriši
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
