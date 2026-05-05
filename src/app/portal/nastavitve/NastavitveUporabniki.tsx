"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { id: string; username: string; isAdmin: boolean };

export function NastavitveUporabniki() {
  const [users, setUsers] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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
      body: JSON.stringify({ username, password, isAdmin }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setUsername("");
    setPassword("");
    setIsAdmin(false);
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
          Kot v namizni aplikaciji (Uporabniki): dostop do portala z bcrypt gesli. Privzeti račun{" "}
          <code className="text-xs">admin</code> ostane možen tudi brez vnosa v bazo, dokler se ujemata z lokalnimi
          nastavitvami okolja.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="grid gap-3 border-t border-[var(--vo-border)] pt-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium text-[var(--vo-fg)]">Nov uporabnik</div>
        <input
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
          placeholder="Uporabniško ime"
          required
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
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--vo-fg)] md:col-span-2">
          <input type="checkbox" checked={isAdmin} onChange={(ev) => setIsAdmin(ev.target.checked)} />
          Administrator (poln dostop do portala)
        </label>
        {formError ? <p className="text-sm text-red-700 md:col-span-2">{formError}</p> : null}
        <button
          type="submit"
          disabled={busy || !!loadError}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"
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
                <th className="px-3 py-2 font-medium">Vloga</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-[var(--vo-muted)]">
                    Ni vpisanih uporabnikov v bazi.
                  </td>
                </tr>
              ) : null}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--vo-border)] last:border-0">
                  <td className="px-3 py-2 font-medium text-[var(--vo-fg)]">{u.username}</td>
                  <td className="px-3 py-2 text-[var(--vo-muted)]">{u.isAdmin ? "Administrator" : "Stranka"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={busy || !!loadError}
                      onClick={() => void handleDelete(u.id)}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                    >
                      Izbriši
                    </button>
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
