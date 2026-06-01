"use client";

import { useEffect, useState } from "react";
import { PortalListSkeleton } from "@/components/portal/PortalListSkeleton";
import { usePortalDbConfigured } from "@/lib/use-portal-db-configured";
import type { SubscriptionPackageDto } from "@/lib/types";
import { PaketiView } from "./PaketiView";

export function PaketiPageClient() {
  const dbConfigured = usePortalDbConfigured();
  const [packages, setPackages] = useState<SubscriptionPackageDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/packages", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { packages?: SubscriptionPackageDto[] }) => {
        if (cancelled) return;
        setPackages(j.packages ?? []);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (packages === null) return <PortalListSkeleton rows={6} />;

  return (
    <PaketiView
      packages={packages}
      dbConfigured={dbConfigured}
      onPackagesChange={(fn) => setPackages((prev) => (prev == null ? prev : typeof fn === "function" ? fn(prev) : fn))}
    />
  );
}
