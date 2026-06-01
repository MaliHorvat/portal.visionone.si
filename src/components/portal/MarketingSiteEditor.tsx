"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { usePortalToast } from "@/context/PortalToastContext";
import { BLOCK_LABELS, BlockListEditor } from "@/components/portal/marketing-editor/BlockEditor";
import { DEFAULT_MARKETING_SITE_CONTENT } from "@/lib/marketing-cms/default-content";
import {
  createBlock,
  createImageSlot,
  createRoute,
  routePublicPath,
} from "@/lib/marketing-cms/helpers";
import type { MarketingBlockType, MarketingRoute, MarketingSiteContent } from "@/lib/marketing-cms/types";

type TabId = "structure" | "content" | "menu" | "images";

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm text-[var(--vo-fg)]";
  return (
    <label className="block text-sm">
      <span className="font-medium text-[var(--vo-muted)]">{label}</span>
      {multiline ? (
        <textarea className={`${cls} min-h-[88px]`} value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

const TABS: { id: TabId; label: string }[] = [
  { id: "structure", label: "Strani" },
  { id: "content", label: "Vsebina" },
  { id: "menu", label: "Meni" },
  { id: "images", label: "Slike" },
];

export function MarketingSiteEditor() {
  const { showToast } = usePortalToast();
  const [tab, setTab] = useState<TabId>("structure");
  const [content, setContent] = useState<MarketingSiteContent>(DEFAULT_MARKETING_SITE_CONTENT);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("route_home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState<MarketingBlockType>("text");

  useEffect(() => {
    void fetch("/api/marketing/admin", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { content?: MarketingSiteContent }) => {
        if (j.content) {
          setContent(j.content);
          if (j.content.routes[0]) setSelectedRouteId(j.content.routes[0].id);
        }
      })
      .catch(() => showToast("Vsebine ni bilo mogoče naložiti.", "err"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const selectedRoute = useMemo(
    () => content.routes.find((r) => r.id === selectedRouteId) ?? content.routes[0],
    [content.routes, selectedRouteId],
  );

  const childRoutes = useMemo(
    () => content.routes.filter((r) => r.parentId === selectedRouteId),
    [content.routes, selectedRouteId],
  );

  const topRoutes = useMemo(
    () => content.routes.filter((r) => !r.parentId).sort((a, b) => a.navOrder - b.navOrder),
    [content.routes],
  );

  const save = useCallback(async () => {
    setSaving(true);
    const res = await fetch("/api/marketing/admin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast((j as { error?: string }).error ?? "Shranjevanje ni uspelo.", "err");
      return;
    }
    const j = (await res.json()) as { content?: MarketingSiteContent };
    if (j.content) setContent(j.content);
    showToast("Spletna stran shranjena.");
  }, [content, showToast]);

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/marketing/media", { method: "POST", body: fd, credentials: "include" });
    setUploadingKey(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showToast((j as { error?: string }).error ?? "Nalaganje ni uspelo.", "err");
      return;
    }
    const j = (await res.json()) as { url?: string };
    if (!j.url) return;
    setContent((c) => ({
      ...c,
      images: { ...c.images, [key]: { ...c.images[key]!, src: j.url! } },
    }));
    showToast("Slika naložena.");
  }

  function updateRoute(routeId: string, patch: Partial<MarketingRoute>) {
    setContent((c) => ({
      ...c,
      routes: c.routes.map((r) => (r.id === routeId ? { ...r, ...patch } : r)),
    }));
  }

  function updateRouteBlocks(routeId: string, blocks: MarketingRoute["blocks"]) {
    updateRoute(routeId, { blocks });
  }

  function addTopPage() {
    const route = createRoute({ label: "Nova stran", slug: "nova-stran" }, content.routes);
    setContent((c) => ({ ...c, routes: [...c.routes, route] }));
    setSelectedRouteId(route.id);
    showToast("Stran dodana.");
  }

  function addSubPage(parentId: string) {
    const parent = content.routes.find((r) => r.id === parentId);
    const route = createRoute(
      { label: "Nova podstran", slug: "podstran", parentId, showInNav: false },
      content.routes,
    );
    setContent((c) => ({ ...c, routes: [...c.routes, route] }));
    setSelectedRouteId(route.id);
    showToast("Podstran dodana.");
  }

  function deleteRoute(routeId: string) {
    if (!confirm("Izbrišem stran in vse podstrani?")) return;
    const toRemove = new Set<string>();
    function collect(id: string) {
      toRemove.add(id);
      content.routes.filter((r) => r.parentId === id).forEach((c) => collect(c.id));
    }
    collect(routeId);
    setContent((c) => ({ ...c, routes: c.routes.filter((r) => !toRemove.has(r.id)) }));
    const next = content.routes.find((r) => !toRemove.has(r.id));
    if (next) setSelectedRouteId(next.id);
  }

  function addImageSlot() {
    const slot = createImageSlot();
    setContent((c) => ({ ...c, images: { ...c.images, [slot.key]: slot } }));
    showToast(`Dodano polje za sliko: ${slot.key}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--vo-muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Nalagam vsebino …
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PortalPageHeader
        kicker="Marketing"
        title="Urejanje visionone.si"
        description="Strani, podstrani, bloki vsebine, gumbi in slike. Po shranitvi se javna stran osveži v ~1 minuti."
      />

      <div className="flex flex-wrap gap-2 border-b border-[var(--vo-border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.id ? "bg-[var(--vo-accent)] text-white" : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "structure" && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <button type="button" onClick={addTopPage} className="vo-btn-primary flex w-full items-center justify-center gap-2 px-3 py-2 text-sm">
              <Plus className="h-4 w-4" /> Nova stran
            </button>
            <ul className="space-y-1 rounded-xl border border-[var(--vo-border)] p-2">
              {topRoutes.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRouteId(r.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      selectedRouteId === r.id ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"
                    }`}
                  >
                    {r.label}
                    <span className="mt-0.5 block font-mono text-[10px] text-[var(--vo-muted)]">{routePublicPath(r, content.routes)}</span>
                  </button>
                  <ul className="ml-3 mt-1 space-y-0.5 border-l border-[var(--vo-border)] pl-2">
                    {content.routes
                      .filter((c) => c.parentId === r.id)
                      .sort((a, b) => a.navOrder - b.navOrder)
                      .map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedRouteId(c.id)}
                            className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                              selectedRouteId === c.id ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"
                            }`}
                          >
                            {c.label} <span className="text-[var(--vo-muted)]">/{c.slug}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {selectedRoute && (
            <div className="rounded-xl border border-[var(--vo-border)] p-4">
              <h3 className="text-lg font-bold text-[var(--vo-fg)]">Nastavitve strani</h3>
              <p className="mt-1 font-mono text-xs text-[var(--vo-muted)]">{routePublicPath(selectedRoute, content.routes)}</p>
              <div className="mt-4 grid max-w-lg gap-3">
                <Field label="Ime v meniju" value={selectedRoute.label} onChange={(v) => updateRoute(selectedRoute.id, { label: v })} />
                <Field
                  label="URL segment (brez /)"
                  value={selectedRoute.slug}
                  onChange={(v) =>
                    updateRoute(selectedRoute.id, {
                      slug: v
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                />
                <Field
                  label="Vrstni red v meniju (manjša številka = bolj levo)"
                  value={String(selectedRoute.navOrder)}
                  onChange={(v) => updateRoute(selectedRoute.id, { navOrder: Number(v) || 0 })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoute.showInNav}
                    onChange={(e) => updateRoute(selectedRoute.id, { showInNav: e.target.checked })}
                  />
                  Prikaži v glavnem meniju
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoute.published}
                    onChange={(e) => updateRoute(selectedRoute.id, { published: e.target.checked })}
                  />
                  Objavljeno (vidno na spletu)
                </label>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-sm font-semibold"
                    onClick={() => addSubPage(selectedRoute.id)}
                  >
                    + Podstran
                  </button>
                  {selectedRoute.id !== "route_home" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 dark:border-red-500/40 dark:text-red-300"
                      onClick={() => deleteRoute(selectedRoute.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Izbriši
                    </button>
                  )}
                </div>
              </div>
              {childRoutes.length > 0 && (
                <p className="mt-4 text-xs text-[var(--vo-muted)]">
                  Podstrani: {childRoutes.map((c) => c.label).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "content" && selectedRoute && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)]/50 p-4">
            <label className="text-sm">
              <span className="font-medium text-[var(--vo-muted)]">Stran</span>
              <select
                className="mt-1 block min-w-[200px] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
              >
                {content.routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({routePublicPath(r, content.routes)})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-[var(--vo-muted)]">Dodaj blok</span>
              <select
                className="mt-1 block rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
                value={newBlockType}
                onChange={(e) => setNewBlockType(e.target.value as MarketingBlockType)}
              >
                {(Object.keys(BLOCK_LABELS) as MarketingBlockType[]).map((t) => (
                  <option key={t} value={t}>
                    {BLOCK_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="vo-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
              onClick={() => {
                let blk = createBlock(newBlockType);
                if (blk.type === "image" && !blk.imageKey) {
                  const firstKey = Object.keys(content.images)[0];
                  if (firstKey) blk = { ...blk, imageKey: firstKey };
                }
                updateRouteBlocks(selectedRoute.id, [...selectedRoute.blocks, blk]);
              }}
            >
              <Plus className="h-4 w-4" /> Dodaj
            </button>
          </div>

          <BlockListEditor
            blocks={selectedRoute.blocks}
            content={content}
            onChange={(blocks) => updateRouteBlocks(selectedRoute.id, blocks)}
            onUploadImage={uploadImage}
          />
        </div>
      )}

      {tab === "menu" && (
        <div className="grid max-w-lg gap-4">
          <h3 className="font-bold text-[var(--vo-fg)]">Gumb v glavi (desno)</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={content.headerCta.show}
              onChange={(e) => setContent((c) => ({ ...c, headerCta: { ...c.headerCta, show: e.target.checked } }))}
            />
            Prikaži gumb v navigaciji
          </label>
          <Field
            label="Besedilo gumba"
            value={content.headerCta.label}
            onChange={(v) => setContent((c) => ({ ...c, headerCta: { ...c.headerCta, label: v } }))}
          />
          <Field
            label="Povezava"
            value={content.headerCta.href}
            onChange={(v) => setContent((c) => ({ ...c, headerCta: { ...c.headerCta, href: v } }))}
          />
          <p className="text-xs text-[var(--vo-muted)]">
            Glavni meni se sestavi iz strani z vključenim «Prikaži v glavnem meniju». Vrstni red: polje navOrder pri vsaki strani (nižje = levo).
          </p>
        </div>
      )}

      {tab === "images" && (
        <div className="space-y-4">
          <button type="button" onClick={addImageSlot} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--vo-accent)]">
            <ImagePlus className="h-4 w-4" /> Dodaj novo polje za sliko
          </button>
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.values(content.images).map((img) => (
              <div key={img.key} className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
                <p className="text-sm font-bold text-[var(--vo-fg)]">{img.label}</p>
                <p className="mt-0.5 font-mono text-xs text-[var(--vo-muted)]">{img.key}</p>
                {img.src ? (
                  <div className="relative mt-3 aspect-video overflow-hidden rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src.startsWith("/") ? img.src : `/${img.src}`}
                      alt={img.alt}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <Field label="Naziv (za urejevalnik)" value={img.label} onChange={(v) => setContent((c) => ({ ...c, images: { ...c.images, [img.key]: { ...img, label: v } } }))} />
                  <Field label="Pot / URL" value={img.src} onChange={(v) => setContent((c) => ({ ...c, images: { ...c.images, [img.key]: { ...img, src: v } } }))} />
                  <Field label="Alt" value={img.alt} onChange={(v) => setContent((c) => ({ ...c, images: { ...c.images, [img.key]: { ...img, alt: v } } }))} />
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--vo-accent)]">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingKey === img.key ? "Nalagam…" : "Naloži datoteko"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingKey === img.key}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadImage(img.key, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--vo-border)] bg-[var(--vo-surface)]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-xs text-[var(--vo-muted)]">
            v{content.version} · {content.routes.length} strani · {Object.keys(content.images).length} slik
          </p>
          <button type="button" onClick={() => void save()} disabled={saving} className="vo-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Shranjujem…" : "Shrani"}
          </button>
        </div>
      </div>
    </div>
  );
}
