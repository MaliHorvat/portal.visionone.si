"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";
import type { ClientSummary, SubscriptionPackageDto } from "@/lib/types";

type Props = {
  clients: ClientSummary[];
  packages: SubscriptionPackageDto[];
  dbConfigured: boolean;
};

export function StrankeView({ clients, packages, dbConfigured }: Props) {
  const { role } = usePortalRole();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (role === "client") {
      router.replace(`/portal/stranke/${mockClientPortalClientId}`);
    }
  }, [role, router]);

  if (role === "client") {
    return <p className="text-sm text-[var(--vo-muted)]">Preusmerjam na vaš objekt …</p>;
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      address: String(form.get("address") ?? ""),
      contact: String(form.get("contact") ?? ""),
      email: String(form.get("email") ?? ""),
      packageId: String(form.get("packageId") ?? "") || null,
    };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Napaka pri ustvarjanju stranke.");
      return;
    }
    setNotice("Stranka je uspešno shranjena.");
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem stranko?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    setNotice("Stranka je uspešno izbrisana.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Stranke</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Seznam strank in paketov.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Prekliči" : "Nova stranka"}
        </button>
      </div>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Baza ni nastavljena. Nastavite <code>DATABASE_URL</code> v Vercelu in poženite{" "}
          <code>npm run db:push</code>. Trenutno so prikazani demo podatki in dodajanje/brisanje ne bo
          delovalo.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">
          {notice}
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input name="name" required placeholder="Ime stranke" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="address" placeholder="Naslov" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="contact" placeholder="Kontaktna oseba" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="E-naslov" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <select name="packageId" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2">
              <option value="">— brez paketa —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price} €)
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Shranjujem…" : "Shrani"}
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Ime</th>
              <th className="px-4 py-3 font-medium">Naslov</th>
              <th className="px-4 py-3 font-medium">Kontakt</th>
              <th className="px-4 py-3 font-medium">Paket</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--vo-muted)]">
                  Ni strank.
                </td>
              </tr>
            ) : null}
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-[var(--vo-border)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{c.name}</td>
                <td className="px-4 py-3 text-[var(--vo-muted)]">{c.address}</td>
                <td className="px-4 py-3 text-[var(--vo-muted)]">
                  {c.contact}
                  {c.email ? (
                    <>
                      <br />
                      <span className="text-xs">{c.email}</span>
                    </>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--vo-fg)]">{c.package?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.health === "ok"
                        ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                        : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
                    }`}
                  >
                    {c.health === "ok" ? "V redu" : "Alarm"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/portal/stranke/${c.id}`}
                    className="font-medium text-[var(--vo-accent)] hover:underline"
                  >
                    Profil
                  </Link>
                  {dbConfigured ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-3 text-xs font-medium text-red-600 hover:underline"
                    >
                      Izbriši
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
