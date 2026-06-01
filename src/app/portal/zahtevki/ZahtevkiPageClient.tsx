"use client";

import { useEffect, useState } from "react";
import { PortalListSkeleton } from "@/components/portal/PortalListSkeleton";
import { usePortalDbConfigured } from "@/lib/use-portal-db-configured";
import type { ClientSummary, ServiceRequest } from "@/lib/types";
import { ZahtevkiView } from "./ZahtevkiView";

export function ZahtevkiPageClient() {
  const dbConfigured = usePortalDbConfigured();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/service-requests").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([reqJson, cliJson]) => {
        if (cancelled) return;
        if (!("requests" in reqJson) || !("clients" in cliJson)) {
          setError("Napaka pri branju zahtevkov.");
          return;
        }
        setRequests((reqJson as { requests: ServiceRequest[] }).requests);
        setClients((cliJson as { clients: ClientSummary[] }).clients);
      })
      .catch(() => {
        if (!cancelled) setError("Napaka pri branju zahtevkov.");
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

  if (requests === null || clients === null) {
    return <PortalListSkeleton />;
  }

  return (
    <ZahtevkiView
      requests={requests}
      clients={clients}
      dbConfigured={dbConfigured}
      onRequestsChange={(fn) => setRequests((prev) => (prev == null ? prev : typeof fn === "function" ? fn(prev) : fn))}
    />
  );
}
