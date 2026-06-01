"use client";

import { useEffect, useState } from "react";
import { PortalListSkeleton } from "@/components/portal/PortalListSkeleton";
import { usePortalDbConfigured } from "@/lib/use-portal-db-configured";
import type { ClientSummary, MaintenanceReminder } from "@/lib/types";
import { OpomnikiView } from "./OpomnikiView";

export function OpomnikiPageClient() {
  const dbConfigured = usePortalDbConfigured();
  const [reminders, setReminders] = useState<MaintenanceReminder[] | null>(null);
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/reminders").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([remJson, cliJson]) => {
        if (cancelled) return;
        if (!("reminders" in remJson) || !("clients" in cliJson)) {
          setError("Napaka pri branju opomnikov.");
          return;
        }
        setReminders((remJson as { reminders: MaintenanceReminder[] }).reminders);
        setClients((cliJson as { clients: ClientSummary[] }).clients);
      })
      .catch(() => {
        if (!cancelled) setError("Napaka pri branju opomnikov.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </p>
    );
  }

  if (reminders === null || clients === null) {
    return <PortalListSkeleton />;
  }

  return <OpomnikiView reminders={reminders} clients={clients} dbConfigured={dbConfigured} />;
}
