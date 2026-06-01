"use client";

import { useState } from "react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { usePortalToast } from "@/context/PortalToastContext";
import { removeFromList, replaceInList } from "@/lib/portal-list-mutate";
import { decimalFromFormData, decimalTextInputProps } from "@/lib/decimal-number-input";
import type { SubscriptionPackageDto } from "@/lib/types";

type Props = {
  packages: SubscriptionPackageDto[];
  dbConfigured: boolean;
  onPackagesChange: React.Dispatch<React.SetStateAction<SubscriptionPackageDto[]>>;
};

export function PaketiView({ packages, dbConfigured, onPackagesChange }: Props) {
  const { role } = usePortalRole();
  const { showToast } = usePortalToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createSeed, setCreateSeed] = useState({ name: "", price: 0, description: "" });
  const [formKey, setFormKey] = useState(0);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      price: decimalFromFormData(form, "price", 0),
      description: String(form.get("description") ?? ""),
    };
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Napaka pri ustvarjanju paketa.");
      return;
    }
    const j = (await res.json()) as { package?: SubscriptionPackageDto };
    if (j.package) onPackagesChange((prev) => [...prev, j.package!]);
    showToast("Paket shranjen.");
    setShowForm(false);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      price: decimalFromFormData(form, "price", 0),
      description: String(form.get("description") ?? ""),
    };
    const res = await fetch(`/api/packages/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri urejanju.");
      return;
    }
    const j = (await res.json()) as { package?: SubscriptionPackageDto };
    if (j.package) onPackagesChange((prev) => replaceInList(prev, j.package!));
    showToast("Paket posodobljen.");
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem paket?")) return;
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    onPackagesChange((prev) => removeFromList(prev, id));
    showToast("Paket izbrisan.");
  }

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Vzdrževalni paketi</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Cenik paketov, ki jih dodelimo strankam.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-sm font-semibold text-white"
          >
            {showForm ? "Prekliči" : "Nov paket"}
          </button>
        ) : null}
      </div>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Baza ni nastavljena. Prikazani so demo paketi.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">
          {notice}
        </div>
      ) : null}

      {showForm && isAdmin ? (
        <form
          key={formKey}
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input name="name" required defaultValue={createSeed.name} placeholder="Ime paketa" className="vo-input px-3 py-2 text-sm" />
            <input name="price" {...decimalTextInputProps} defaultValue={createSeed.price} required placeholder="Cena (€), npr. 29,90" className="vo-input px-3 py-2 text-sm" />
            <textarea
              name="description"
              defaultValue={createSeed.description}
              placeholder="Opis paketa"
              className="vo-input px-3 py-2 text-sm md:col-span-2"
              rows={2}
            />
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

      {isAdmin ? (
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--vo-fg)]">Predlogi VisionOne Care (Box + monitoring)</p>
          <p className="mt-1 text-xs text-[var(--vo-muted)]">
            Stranka ne upravlja naprave — VisionOne Box na objektu, vi spremljate v meniju Care Box.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {[
              {
                name: "Basic Care",
                price: 39,
                description:
                  "VisionOne Care Box, mesečno poročilo, monitoring kamer/NVR, odziv naslednji delovni dan.",
              },
              {
                name: "Pro Care",
                price: 89,
                description:
                  "Care Box + 24/7 monitoring, Telegram alarmi vam, prednostni oddaljeni dostop (SLA 8 h).",
              },
              {
                name: "Enterprise Care",
                price: 149,
                description:
                  "Care Box + kritični SLA 4 h, kvartalni onsite, backup konfiguracij NVR, varnostni pregled.",
              },
            ].map((p) => (
              <button
                key={p.name}
                type="button"
                className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-left text-xs hover:bg-[var(--vo-surface-2)]"
                onClick={() => {
                  setCreateSeed(p);
                  setShowForm(true);
                  setFormKey((k) => k + 1);
                }}
              >
                <p className="font-semibold text-[var(--vo-fg)]">{p.name}</p>
                <p className="text-[var(--vo-accent)]">{p.price} € / mesec</p>
                <p className="mt-1 text-[var(--vo-muted)]">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {packages.length === 0 ? (
          <p className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 text-sm text-[var(--vo-muted)] md:col-span-3">
            Ni paketov.
          </p>
        ) : null}
        {packages.map((p) =>
          editingId === p.id ? (
            <form
              key={p.id}
              onSubmit={(e) => handleSaveEdit(e, p.id)}
              className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]"
            >
              <input name="name" defaultValue={p.name} required className="w-full vo-input px-3 py-2 text-sm" />
              <input name="price" {...decimalTextInputProps} defaultValue={p.price} required placeholder="npr. 29,90" className="w-full vo-input px-3 py-2 text-sm" />
              <textarea
                name="description"
                defaultValue={p.description}
                rows={3}
                className="w-full vo-input px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-[var(--vo-accent)] px-3 py-1.5 text-xs font-semibold text-white">
                  Shrani
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs font-medium text-[var(--vo-muted)]"
                >
                  Prekliči
                </button>
              </div>
            </form>
          ) : (
            <div
              key={p.id}
              className="space-y-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-[var(--vo-fg)]">{p.name}</h3>
                <span className="text-sm font-semibold text-[var(--vo-accent)]">
                  {p.price.toFixed(2)} €
                </span>
              </div>
              <p className="text-sm text-[var(--vo-muted)]">{p.description || "—"}</p>
              {isAdmin && dbConfigured ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(p.id)}
                    className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs font-medium text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
                  >
                    Uredi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Izbriši
                  </button>
                </div>
              ) : null}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
