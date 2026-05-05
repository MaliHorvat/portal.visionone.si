"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientDetail } from "@/lib/types";
import { TabCas } from "./client-workspace/TabCas";
import { TabKamere } from "./client-workspace/TabKamere";
import { TabOprema } from "./client-workspace/TabOprema";
import { TabPonudbe } from "./client-workspace/TabPonudbe";
import { TabPopisi } from "./client-workspace/TabPopisi";
import { TabRack } from "./client-workspace/TabRack";
import { TabShema } from "./client-workspace/TabShema";
import { TabVzdrzevanje } from "./client-workspace/TabVzdrzevanje";
import type { WorkspaceCtx, WorkspaceTab } from "./client-workspace/types";
import {
  Boxes,
  Camera,
  ClipboardList,
  Clock,
  FileText,
  Layers,
  LayoutGrid,
  Network,
  Wrench,
} from "lucide-react";

const TABS: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { id: "kamere", label: "Kamere", icon: Camera },
  { id: "oprema", label: "Oprema", icon: Boxes },
  { id: "shema", label: "Shema", icon: Network },
  { id: "rack", label: "Rack", icon: Layers },
  { id: "ponudbe", label: "Ponudbe", icon: FileText },
  { id: "popisi", label: "Popisi", icon: ClipboardList },
  { id: "cas", label: "Čas", icon: Clock },
  { id: "vzdrzevanje", label: "Vzdrževanje", icon: Wrench },
];

function normalizeTab(raw: string | null): WorkspaceTab {
  const ids = new Set(TABS.map((t) => t.id));
  return raw && ids.has(raw as WorkspaceTab) ? (raw as WorkspaceTab) : "kamere";
}

type Props = {
  initialClient: ClientDetail;
  dbConfigured: boolean;
};

export function ClientWorkspace({ initialClient, dbConfigured }: Props) {
  const searchParams = useSearchParams();
  const tab = normalizeTab(searchParams.get("tab"));
  const [client, setClient] = useState(initialClient);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  const reload = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${client.id}`);
    if (!r.ok) return;
    const j = await r.json();
    setClient(j.client as ClientDetail);
  }, [client.id, dbConfigured]);

  const ctx: WorkspaceCtx = useMemo(
    () => ({
      clientId: client.id,
      client,
      dbConfigured,
      reload,
    }),
    [client, dbConfigured, reload],
  );

  const pkgLabel = client.package
    ? `${client.package.name} (${client.package.price} €)`
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">{client.name}</h1>
          <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-3 py-1 text-xs text-[var(--vo-muted)]">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            {pkgLabel}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--vo-border)] pb-px text-xs font-medium md:text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={`/portal/stranke/${client.id}?tab=${id}`}
              scroll={false}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 ${
                active
                  ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                  : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-[320px]">
        {tab === "kamere" ? <TabKamere ctx={ctx} /> : null}
        {tab === "oprema" ? <TabOprema ctx={ctx} /> : null}
        {tab === "shema" ? <TabShema ctx={ctx} /> : null}
        {tab === "rack" ? <TabRack ctx={ctx} /> : null}
        {tab === "ponudbe" ? <TabPonudbe ctx={ctx} /> : null}
        {tab === "popisi" ? <TabPopisi ctx={ctx} /> : null}
        {tab === "cas" ? <TabCas ctx={ctx} /> : null}
        {tab === "vzdrzevanje" ? <TabVzdrzevanje ctx={ctx} /> : null}
      </div>
    </div>
  );
}
