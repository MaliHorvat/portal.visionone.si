"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, RadioTower } from "lucide-react";

type Counts = { total: number; offline: number; deviceIssues: number };

export function PortalCareBoxAlert() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/care-box", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { counts?: Counts }) => {
        if (!cancelled && j.counts) setCounts(j.counts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!counts || counts.total === 0) return null;
  if (counts.offline === 0 && counts.deviceIssues === 0) return null;

  return (
    <Link
      href="/portal/care-box"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm transition hover:bg-amber-500/15"
    >
      <span className="flex items-center gap-2 font-medium text-amber-100">
        <RadioTower className="h-4 w-4 shrink-0" aria-hidden />
        Care Box — pozor
      </span>
      <span className="flex flex-wrap items-center gap-3 text-amber-100/90">
        {counts.offline > 0 ? (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {counts.offline} offline
          </span>
        ) : null}
        {counts.deviceIssues > 0 ? (
          <span>{counts.deviceIssues} objekt(ov) z težavami na napravah</span>
        ) : null}
        <span className="text-xs font-semibold text-[var(--vo-accent)]">Pregled →</span>
      </span>
    </Link>
  );
}
