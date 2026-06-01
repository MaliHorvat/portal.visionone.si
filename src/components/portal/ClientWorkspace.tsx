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
import { TabDokumenti } from "./client-workspace/TabDokumenti";
import { TabTimeline } from "./client-workspace/TabTimeline";
import { TabField } from "./client-workspace/TabField";
import { TabCareBox } from "./client-workspace/TabCareBox";
import type { WorkspaceCtx, WorkspaceTab } from "./client-workspace/types";
import { parseWorkspaceTab } from "./client-workspace/types";
import { getLastClientTab, pushRecentClient, setLastClientTab } from "@/lib/portal-prefs";
import {
  Building2,
  Boxes,
  Camera,
  ClipboardList,
  Clock,
  FolderOpen,
  FileText,
  MapPin,
  Mail,
  Phone,
  Layers,
  LayoutGrid,
  Network,
  Shield,
  Smartphone,
  Star,
  RadioTower,
  Wrench,
} from "lucide-react";
import { getFavoriteClientIds, toggleFavoriteClient } from "@/lib/portal-prefs";
import { ClientProfileEditor } from "./ClientProfileEditor";
import { ClientInternalNotes } from "./ClientInternalNotes";

const TABS: { id: WorkspaceTab; label: string; icon: ElementType }[] = [
  { id: "kamere", label: "Kamere", icon: Camera },
  { id: "oprema", label: "Oprema", icon: Boxes },
  { id: "rpi", label: "Care Box", icon: RadioTower },
  { id: "shema", label: "Shema", icon: Network },
  { id: "rack", label: "Rack", icon: Layers },
  { id: "ponudbe", label: "Ponudbe", icon: FileText },
  { id: "popisi", label: "Popisi", icon: ClipboardList },
  { id: "cas", label: "Čas", icon: Clock },
  { id: "vzdrzevanje", label: "Vzdrževanje", icon: Wrench },
  { id: "dokumenti", label: "Dokumenti", icon: FolderOpen },
  /** Pred Timeline — na ozkih zaslonih se Field skrival desno od vrstice z overflow-x. */
  { id: "field", label: "Teren", icon: Smartphone },
  { id: "timeline", label: "Timeline", icon: Shield },
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
  const [isFavorite, setIsFavorite] = useState(false);

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
    setLastClientTab(client.id, id);
    setVisited((v) => new Set(v).add(id));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", qs ? `${url.pathname}?${qs}` : url.pathname);
    }
  }, [client.id]);

  const reload = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${client.id}`);
    if (!r.ok) return;
    const j = await r.json();
    setClient(j.client as ClientDetail);
  }, [client.id, dbConfigured]);

  useEffect(() => {
    pushRecentClient(client.id, client.name);
    setIsFavorite(getFavoriteClientIds().includes(client.id));
  }, [client.id, client.name]);

  useEffect(() => {
    const remembered = getLastClientTab(client.id);
    if (remembered && remembered !== initialTab) {
      setTab(remembered);
      setVisited((v) => new Set(v).add(remembered));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", remembered);
        window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
      }
    }
  }, [client.id, initialTab]);

  const ctx: WorkspaceCtx = useMemo(
    () => ({
      clientId: client.id,
      client,
      dbConfigured,
      reload,
      applyClient: (next) => setClient(next),
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
      <div className="vo-card vo-card-glass p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="vo-page-title text-2xl">{client.name}</h1>
              <button
                type="button"
                title={isFavorite ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
                onClick={() => setIsFavorite(toggleFavoriteClient(client.id).includes(client.id))}
                className="rounded p-1 text-[var(--vo-muted)] hover:text-amber-400"
              >
                <Star className={`h-5 w-5 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
              </button>
            </div>
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
              {client.phone ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {client.phone}
                </span>
              ) : null}
              {client.email ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {client.email}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                <Camera className="h-3.5 w-3.5" aria-hidden />
                {client.cameras.length} kamer
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                <Boxes className="h-3.5 w-3.5" aria-hidden />
                {client.nvrs.length} NVR · {client.switches.length} stikala
              </span>
            </div>
            <div className="mt-3">
              <ClientProfileEditor ctx={ctx} onOpenPonudbe={() => selectTab("ponudbe")} />
            </div>
            <ClientInternalNotes clientId={client.id} />
          </div>
          <button
            type="button"
            onClick={() => selectTab("field")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--vo-accent)] hover:opacity-90 md:text-sm"
            title="Check-in, checklista, fotografije, podpis, PDF"
          >
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
            Terenski način
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-[var(--vo-muted)]">
          Skok na zavihek
          <select
            value={tab}
            onChange={(e) => selectTab(e.target.value as WorkspaceTab)}
            className="ml-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-1.5 text-xs text-[var(--vo-fg)]"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="vo-tab-nav text-xs font-medium md:text-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`vo-tab-btn shrink-0 whitespace-nowrap ${active ? "vo-tab-btn-active" : ""}`}
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
        {panel("rpi", <TabCareBox ctx={ctx} />)}
        {panel("shema", <TabShema ctx={ctx} />)}
        {panel("rack", <TabRack ctx={ctx} />)}
        {panel("ponudbe", <TabPonudbe ctx={ctx} />)}
        {panel("popisi", <TabPopisi ctx={ctx} />)}
        {panel("cas", <TabCas ctx={ctx} />)}
        {panel("vzdrzevanje", <TabVzdrzevanje ctx={ctx} />)}
        {panel("dokumenti", <TabDokumenti ctx={ctx} />)}
        {panel("field", <TabField ctx={ctx} />)}
        {panel("timeline", <TabTimeline ctx={ctx} />)}
      </div>
    </div>
  );
}
