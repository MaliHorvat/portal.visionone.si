"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { ClientSummary } from "@/lib/types";

export function MojKontaktView() {
  const [client, setClient] = useState<ClientSummary | null>(null);

  useEffect(() => {
    void fetch("/api/moj/overview", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { client?: ClientSummary }) => setClient(j.client ?? null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Kontakt</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">Vaš skrbnik in splošni kontakt VisionOne.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="tel:+38640123456"
          className="vo-card-hover flex items-center gap-3 rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5"
        >
          <Phone className="h-8 w-8 text-[var(--vo-accent)]" />
          <div>
            <p className="text-xs font-bold uppercase text-[var(--vo-muted)]">Telefon (urgenca)</p>
            <p className="font-bold text-[var(--vo-fg)]">+386 40 123 456</p>
          </div>
        </a>
        <a
          href="mailto:info@visionone.si"
          className="vo-card-hover flex items-center gap-3 rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5"
        >
          <Mail className="h-8 w-8 text-[var(--vo-accent)]" />
          <div>
            <p className="text-xs font-bold uppercase text-[var(--vo-muted)]">E-pošta</p>
            <p className="font-bold text-[var(--vo-fg)]">info@visionone.si</p>
          </div>
        </a>
      </div>

      {client ? (
        <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <h2 className="text-sm font-bold text-[var(--vo-fg)]">Kontakt za vaš objekt</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {client.contact ? (
              <li className="flex gap-2">
                <span className="text-[var(--vo-muted)]">Skrbnik:</span>
                <span className="font-medium">{client.contact}</span>
              </li>
            ) : null}
            {client.phone ? (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--vo-accent)]" />
                <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="font-medium text-[var(--vo-accent)]">
                  {client.phone}
                </a>
              </li>
            ) : null}
            {client.email ? (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--vo-accent)]" />
                <a href={`mailto:${client.email}`} className="font-medium text-[var(--vo-accent)]">
                  {client.email}
                </a>
              </li>
            ) : null}
            {client.address ? (
              <li className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--vo-accent)]" />
                <span>{client.address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
