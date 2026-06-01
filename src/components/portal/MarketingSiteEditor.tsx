"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { usePortalToast } from "@/context/PortalToastContext";
import { DEFAULT_MARKETING_SITE_CONTENT } from "@/lib/marketing-cms/default-content";
import type { MarketingImageConfig, MarketingPageId, MarketingSiteContent } from "@/lib/marketing-cms/types";

const PAGE_TABS: { id: MarketingPageId | "images"; label: string }[] = [
  { id: "home", label: "Domov" },
  { id: "storitve", label: "Storitve" },
  { id: "produkti", label: "Produkti" },
  { id: "kontakt", label: "Kontakt" },
  { id: "images", label: "Slike" },
];

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

export function MarketingSiteEditor() {
  const { showToast } = usePortalToast();
  const [tab, setTab] = useState<MarketingPageId | "images">("home");
  const [content, setContent] = useState<MarketingSiteContent>(DEFAULT_MARKETING_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/marketing/admin", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { content?: MarketingSiteContent }) => {
        if (j.content) setContent(j.content);
      })
      .catch(() => showToast("Vsebine ni bilo mogoče naložiti.", "err"))
      .finally(() => setLoading(false));
  }, [showToast]);

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
      images: {
        ...c.images,
        [key]: { ...c.images[key]!, src: j.url! },
      },
    }));
    showToast("Slika naložena.");
  }

  function updateImage(key: string, patch: Partial<MarketingImageConfig>) {
    setContent((c) => ({
      ...c,
      images: { ...c.images, [key]: { ...c.images[key]!, ...patch, key } },
    }));
  }

  const home = content.pages.home;
  const storitve = content.pages.storitve;
  const produkti = content.pages.produkti;
  const kontakt = content.pages.kontakt;
  const homeHero = home?.hero && "trustPills" in home.hero ? home.hero : null;

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
        description="Besedila in slike javne spletne strani. Po shranitvi se visionone.si osveži v ~1 minuti."
      />

      <div className="flex flex-wrap gap-2 border-b border-[var(--vo-border)] pb-3">
        {PAGE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[var(--vo-accent)] text-white"
                : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "home" && homeHero && (
        <div className="grid max-w-3xl gap-4">
          <Field label="Značka (badge)" value={homeHero.eyebrow} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, eyebrow: v } } } }))} />
          <Field label="Naslov (1. del)" value={homeHero.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, title: v } } } }))} />
          <Field label="Naslov (poudarjen del)" value={homeHero.titleHighlight} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, titleHighlight: v } } } }))} />
          <Field label="Uvodni odstavek" value={homeHero.description} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, description: v } } } }))} multiline />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gumb 1" value={homeHero.ctaPrimary} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, ctaPrimary: v } } } }))} />
            <Field label="Gumb 2" value={homeHero.ctaSecondary} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, hero: { ...homeHero, ctaSecondary: v } } } }))} />
          </div>
          <Field
            label="Zaupanje (ločeno z vejico)"
            value={homeHero.trustPills.join(", ")}
            onChange={(v) =>
              setContent((c) => ({
                ...c,
                pages: {
                  ...c.pages,
                  home: {
                    ...c.pages.home,
                    hero: { ...homeHero, trustPills: v.split(",").map((s) => s.trim()).filter(Boolean) },
                  },
                },
              }))
            }
          />
          {home.splitCctv && (
            <>
              <h3 className="pt-4 text-lg font-bold text-[var(--vo-fg)]">Blok videonadzor (split)</h3>
              <Field label="Kicker" value={home.splitCctv.kicker ?? ""} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, splitCctv: { ...home.splitCctv!, kicker: v } } } }))} />
              <Field label="Naslov" value={home.splitCctv.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, splitCctv: { ...home.splitCctv!, title: v } } } }))} />
              <Field label="Besedilo" value={home.splitCctv.body} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, home: { ...c.pages.home, splitCctv: { ...home.splitCctv!, body: v } } } }))} multiline />
            </>
          )}
        </div>
      )}

      {tab === "storitve" && storitve?.hero && "description" in storitve.hero && (
        <div className="grid max-w-3xl gap-4">
          <Field label="Značka" value={storitve.hero.eyebrow} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, hero: { ...storitve.hero!, eyebrow: v } } } }))} />
          <Field label="Naslov" value={storitve.hero.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, hero: { ...storitve.hero!, title: v } } } }))} />
          <Field label="Opis" value={storitve.hero.description} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, hero: { ...storitve.hero!, description: v } } } }))} multiline />
          {storitve.splitCctv && (
            <>
              <h3 className="pt-4 text-lg font-bold">Glavni blok CCTV</h3>
              <Field label="Naslov" value={storitve.splitCctv.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, splitCctv: { ...storitve.splitCctv!, title: v } } } }))} />
              <Field label="Besedilo" value={storitve.splitCctv.body} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, splitCctv: { ...storitve.splitCctv!, body: v } } } }))} multiline />
            </>
          )}
          <h3 className="pt-4 text-lg font-bold">Storitveni bloki</h3>
          {(storitve.serviceBlocks ?? []).map((block, i) => (
            <div key={block.id} className="rounded-xl border border-[var(--vo-border)] p-4">
              <p className="text-xs font-bold text-[var(--vo-accent)]">{block.imageKey}</p>
              <div className="mt-2 grid gap-3">
                <Field
                  label="Naslov"
                  value={block.title}
                  onChange={(v) => {
                    const blocks = [...(storitve.serviceBlocks ?? [])];
                    blocks[i] = { ...block, title: v };
                    setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, serviceBlocks: blocks } } }));
                  }}
                />
                <Field
                  label="Besedilo"
                  value={block.body}
                  onChange={(v) => {
                    const blocks = [...(storitve.serviceBlocks ?? [])];
                    blocks[i] = { ...block, body: v };
                    setContent((c) => ({ ...c, pages: { ...c.pages, storitve: { ...storitve, serviceBlocks: blocks } } }));
                  }}
                  multiline
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "produkti" && produkti?.hero && "description" in produkti.hero && (
        <div className="grid max-w-3xl gap-4">
          <Field label="Značka" value={produkti.hero.eyebrow} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, produkti: { ...produkti, hero: { ...produkti.hero!, eyebrow: v } } } }))} />
          <Field label="Naslov" value={produkti.hero.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, produkti: { ...produkti, hero: { ...produkti.hero!, title: v } } } }))} />
          <Field label="Opis" value={produkti.hero.description} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, produkti: { ...produkti, hero: { ...produkti.hero!, description: v } } } }))} multiline />
        </div>
      )}

      {tab === "kontakt" && kontakt?.hero && "description" in kontakt.hero && (
        <div className="grid max-w-3xl gap-4">
          <Field label="Značka" value={kontakt.hero.eyebrow} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, kontakt: { ...kontakt, hero: { ...kontakt.hero!, eyebrow: v } } } }))} />
          <Field label="Naslov" value={kontakt.hero.title} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, kontakt: { ...kontakt, hero: { ...kontakt.hero!, title: v } } } }))} />
          <Field label="Opis" value={kontakt.hero.description} onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, kontakt: { ...kontakt, hero: { ...kontakt.hero!, description: v } } } }))} multiline />
          <Field
            label="Uvod nad obrazcem"
            value={kontakt.contactIntro ?? ""}
            onChange={(v) => setContent((c) => ({ ...c, pages: { ...c.pages, kontakt: { ...kontakt, contactIntro: v } } }))}
            multiline
          />
        </div>
      )}

      {tab === "images" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.values(content.images).map((img) => (
            <div key={img.key} className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
              <p className="text-sm font-bold text-[var(--vo-fg)]">{img.label}</p>
              <p className="mt-0.5 font-mono text-xs text-[var(--vo-muted)]">{img.key}</p>
              {img.src ? (
                <div className="relative mt-3 aspect-video overflow-hidden rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src.startsWith("/marketing/") ? img.src : img.src.startsWith("/") ? img.src : `/${img.src}`}
                    alt={img.alt}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="mt-3 grid gap-3">
                <Field label="Pot do slike (URL ali datoteka v /public)" value={img.src} onChange={(v) => updateImage(img.key, { src: v })} />
                <Field label="Alt besedilo" value={img.alt} onChange={(v) => updateImage(img.key, { alt: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Širina %"
                    value={String(img.widthPercent ?? "")}
                    onChange={(v) => updateImage(img.key, { widthPercent: v ? Number(v) : undefined })}
                  />
                  <label className="block text-sm">
                    <span className="font-medium text-[var(--vo-muted)]">object-fit</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
                      value={img.objectFit ?? "cover"}
                      onChange={(e) => updateImage(img.key, { objectFit: e.target.value as "cover" | "contain" })}
                    >
                      <option value="cover">cover</option>
                      <option value="contain">contain</option>
                    </select>
                  </label>
                </div>
                <Field label="object-position" value={img.objectPosition ?? "center"} onChange={(v) => updateImage(img.key, { objectPosition: v })} />
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--vo-accent)]">
                  <ImagePlus className="h-4 w-4" aria-hidden />
                  {uploadingKey === img.key ? "Nalagam…" : "Naloži novo sliko"}
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
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--vo-border)] bg-[var(--vo-surface)]/95 px-4 py-3 backdrop-blur-md md:left-[var(--portal-sidebar-width,0px)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-xs text-[var(--vo-muted)]">
            Verzija {content.version} · {content.updatedAt ? new Date(content.updatedAt).toLocaleString("sl-SI") : "—"}
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
