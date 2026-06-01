"use client";

import { useEffect, useState } from "react";
import { PortalListSkeleton } from "@/components/portal/PortalListSkeleton";
import { formatDbLoadError } from "@/lib/db-load-error";
import { getMockClients, mockPackages } from "@/lib/mock-data";
import { usePortalDbConfigured } from "@/lib/use-portal-db-configured";
import type { ClientSummary, SubscriptionPackageDto } from "@/lib/types";
import { StrankeView } from "./StrankeView";

export function StrankePageClient() {
  const envDbConfigured = usePortalDbConfigured();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackageDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbConfigured, setDbConfigured] = useState(true);

  useEffect(() => {
    if (!envDbConfigured) {
      setDbConfigured(false);
      setClients(
        getMockClients().map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          address: c.address,
          contact: c.contact,
          phone: c.phone,
          email: c.email,
          package: c.package,
          health: c.health,
          tags: c.tags ?? [],
        })),
      );
      setPackages(mockPackages);
      return;
    }

    let cancelled = false;
    void Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/packages").then((r) => r.json()),
    ])
      .then(([cliJson, pkgJson]) => {
        if (cancelled) return;
        if (!("clients" in cliJson)) {
          setLoadError(formatDbLoadError(new Error("clients")));
          setDbConfigured(false);
          setClients([]);
          setPackages([]);
          return;
        }
        setClients((cliJson as { clients: ClientSummary[] }).clients);
        if ("packages" in pkgJson) {
          setPackages((pkgJson as { packages: SubscriptionPackageDto[] }).packages);
        } else {
          setLoadError(formatDbLoadError(new Error("packages")));
          setDbConfigured(false);
          setPackages([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(formatDbLoadError(err));
          setDbConfigured(false);
          setClients([]);
          setPackages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [envDbConfigured]);

  if (clients === null || packages === null) {
    return <PortalListSkeleton rows={10} />;
  }

  return (
    <StrankeView
      clients={clients}
      packages={packages}
      dbConfigured={dbConfigured && envDbConfigured}
      loadError={loadError}
      onClientsChange={(fn) => setClients((prev) => (prev == null ? prev : typeof fn === "function" ? fn(prev) : fn))}
    />
  );
}
