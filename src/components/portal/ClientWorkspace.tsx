"use client";

import type { ElementType, ReactNode } from "react";
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
import { parseWorkspaceTab } from "./client-workspace/types";
import {
  Building2,
  Boxes,
  Camera,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  Phone,
  Layers,
  LayoutGrid,
  Network,
  Wrench,
} from "lucide-react";

const TABS: { id: WorkspaceTab; label: string; icon: ElementType }[] = [
  { id: "kamere", label: "Kamere", icon: Camera },
  { id: "oprema", label: "Oprema", icon: Boxes },
  { id: "shema", label: "Shema", icon: Network },
  { id: "rack", label: "Rack", icon: Layers },
  { id: "ponudbe", label: "Ponudbe", icon: FileText },
  { id: "popisi", label: "Popisi", icon: ClipboardList },
  { id: "cas", label: "Čas", icon: Clock },
  { id: "vzdrzevanje", label: "Vzdrževanje", icon: Wrench },
];

type Props = {
  initialClient: ClientDetail;
  dbConfigured: boolean;
  initialTab: WorkspaceTab;
};

export function ClientWorkspace({ initialClient, dbConfigured, initialTab }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [visited, setVisited] = useState<Set<WorkspaceTab>>(() => new Set([initialTab]));
  const [client, setClient] = useState(initialClient);

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  useEffect(() => {
    setTab(initialTab);
    setVisited(new Set([initialTab]));
  }, [initialClient.id, initialTab]);

  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      const t = parseWorkspaceTab(sp.get("tab"));
      setTab(t);
      setVisited((v) => new Set(v).add(t));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const selectTab = useCallback((id: WorkspaceTab) => {
    setTab(id);
    setVisited((v) => new Set(v).add(id));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", qs ? `${url.pathname}?${qs}` : url.pathname);
    }
  }, []);

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
  const healthOk = client.health === "ok";

  function panel(id: WorkspaceTab, node: ReactNode) {
    if (!visited.has(id)) return null;
    const hidden = tab !== id;
    return (
      <div className={hidden ? "hidden" : undefined} aria-hidden={hidden}>
        {node}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--vo-fg)]">{client.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
                  healthOk
                    ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                    : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {healthOk ? "Objekt OK" : "Objekt alarm"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-1 text-[var(--vo-muted)]">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                {pkgLabel}
              </span>
              {client.address ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {client.address}
                </span>
              ) : null}
              {client.contact ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {client.contact}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1 text-xs font-medium md:text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 ${
                active
                  ? "border border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-fg)]"
                  : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-[320px]">
        {panel("kamere", <TabKamere ctx={ctx} />)}
        {panel("oprema", <TabOprema ctx={ctx} />)}
        {panel("shema", <TabShema ctx={ctx} />)}
        {panel("rack", <TabRack ctx={ctx} />)}
        {panel("ponudbe", <TabPonudbe ctx={ctx} />)}
        {panel("popisi", <TabPopisi ctx={ctx} />)}
        {panel("cas", <TabCas ctx={ctx} />)}
        {panel("vzdrzevanje", <TabVzdrzevanje ctx={ctx} />)}
      </div>
    </div>
  );
}
