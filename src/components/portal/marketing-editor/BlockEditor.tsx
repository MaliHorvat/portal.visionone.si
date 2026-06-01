"use client";

import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import type { MarketingBlock, MarketingBlockType, MarketingSiteContent } from "@/lib/marketing-cms/types";
import { createBlock, createButton, newMarketingId } from "@/lib/marketing-cms/helpers";

const BLOCK_LABELS: Record<MarketingBlockType, string> = {
  hero: "Hero (domov)",
  pageHero: "Uvod strani",
  text: "Besedilo",
  image: "Slika",
  split: "Besedilo + slika",
  buttons: "Gumbi",
  stats: "Številke",
  cards: "Kartice",
  serviceBlocks: "Storitveni bloki",
  ctaBand: "Pasica s pozivom",
  contactForm: "Kontaktni obrazec",
};

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
        <textarea className={`${cls} min-h-[72px]`} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

type Props = {
  block: MarketingBlock;
  content: MarketingSiteContent;
  onChange: (block: MarketingBlock) => void;
  onUploadImage: (key: string, file: File) => void;
};

export function BlockEditor({ block, content, onChange, onUploadImage }: Props) {
  const imageKeys = Object.keys(content.images);

  function imageKeySelect(value: string, onPick: (k: string) => void) {
    return (
      <label className="block text-sm">
        <span className="font-medium text-[var(--vo-muted)]">Slika (ključ)</span>
        <select
          className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onPick(e.target.value)}
        >
          <option value="">— izberi —</option>
          {imageKeys.map((k) => (
            <option key={k} value={k}>
              {content.images[k]?.label ?? k}
            </option>
          ))}
        </select>
      </label>
    );
  }

  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3">
          <Field label="Značka" value={block.eyebrow} onChange={(v) => onChange({ ...block, eyebrow: v })} />
          <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Poudarek" value={block.titleHighlight} onChange={(v) => onChange({ ...block, titleHighlight: v })} />
          <Field label="Opis" value={block.description} onChange={(v) => onChange({ ...block, description: v })} multiline />
          {imageKeySelect(block.imageKey, (k) => onChange({ ...block, imageKey: k }))}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Gumb 1 — besedilo" value={block.ctaPrimary} onChange={(v) => onChange({ ...block, ctaPrimary: v })} />
            <Field label="Gumb 1 — povezava" value={block.ctaPrimaryHref} onChange={(v) => onChange({ ...block, ctaPrimaryHref: v })} />
            <Field label="Gumb 2 — besedilo" value={block.ctaSecondary} onChange={(v) => onChange({ ...block, ctaSecondary: v })} />
            <Field label="Gumb 2 — povezava" value={block.ctaSecondaryHref} onChange={(v) => onChange({ ...block, ctaSecondaryHref: v })} />
          </div>
          <Field
            label="Zaupanje (vejice)"
            value={block.trustPills.join(", ")}
            onChange={(v) => onChange({ ...block, trustPills: v.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      );
    case "pageHero":
      return (
        <div className="grid gap-3">
          <Field label="Značka" value={block.eyebrow} onChange={(v) => onChange({ ...block, eyebrow: v })} />
          <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Opis" value={block.description} onChange={(v) => onChange({ ...block, description: v })} multiline />
        </div>
      );
    case "text":
      return (
        <div className="grid gap-3">
          <Field label="Kicker" value={block.kicker} onChange={(v) => onChange({ ...block, kicker: v })} />
          <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Besedilo" value={block.body} onChange={(v) => onChange({ ...block, body: v })} multiline />
        </div>
      );
    case "image":
      return (
        <div className="grid gap-3">
          {imageKeySelect(block.imageKey, (k) => onChange({ ...block, imageKey: k }))}
          <Field label="Napis" value={block.caption} onChange={(v) => onChange({ ...block, caption: v })} />
          {block.imageKey ? (
            <label className="text-sm font-semibold text-[var(--vo-accent)]">
              Naloži sliko
              <input
                type="file"
                accept="image/*"
                className="mt-1 block text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadImage(block.imageKey, f);
                }}
              />
            </label>
          ) : null}
        </div>
      );
    case "split":
      return (
        <div className="grid gap-3">
          {imageKeySelect(block.imageKey, (k) => onChange({ ...block, imageKey: k }))}
          <Field label="Kicker" value={block.kicker} onChange={(v) => onChange({ ...block, kicker: v })} />
          <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Besedilo" value={block.body} onChange={(v) => onChange({ ...block, body: v })} multiline />
          <Field label="Povezava — besedilo" value={block.linkLabel} onChange={(v) => onChange({ ...block, linkLabel: v })} />
          <Field label="Povezava — URL" value={block.linkHref} onChange={(v) => onChange({ ...block, linkHref: v })} />
        </div>
      );
    case "buttons":
    case "ctaBand":
      return (
        <div className="grid gap-3">
          {block.type === "ctaBand" && (
            <>
              <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
              <Field label="Besedilo" value={block.body} onChange={(v) => onChange({ ...block, body: v })} multiline />
            </>
          )}
          {(block.type === "buttons" ? block.items : block.buttons).map((btn, i) => (
            <div key={btn.id} className="rounded-lg border border-[var(--vo-border)] p-3">
              <p className="text-xs font-bold text-[var(--vo-muted)]">Gumb {i + 1}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field
                  label="Besedilo"
                  value={btn.label}
                  onChange={(v) => {
                    const items = [...(block.type === "buttons" ? block.items : block.buttons)];
                    items[i] = { ...btn, label: v };
                    onChange(block.type === "buttons" ? { ...block, items } : { ...block, buttons: items });
                  }}
                />
                <Field
                  label="Povezava"
                  value={btn.href}
                  onChange={(v) => {
                    const items = [...(block.type === "buttons" ? block.items : block.buttons)];
                    items[i] = { ...btn, href: v };
                    onChange(block.type === "buttons" ? { ...block, items } : { ...block, buttons: items });
                  }}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-[var(--vo-accent)]"
            onClick={() => {
              const btn = createButton();
              if (block.type === "buttons") onChange({ ...block, items: [...block.items, btn] });
              else onChange({ ...block, buttons: [...block.buttons, btn] });
            }}
          >
            + Dodaj gumb
          </button>
        </div>
      );
    case "stats":
      return (
        <div className="grid gap-3">
          {block.items.map((item, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2 rounded-lg border border-[var(--vo-border)] p-3">
              <Field
                label="Številka"
                value={item.value}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = { ...item, value: v };
                  onChange({ ...block, items });
                }}
              />
              <Field
                label="Opis"
                value={item.label}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = { ...item, label: v };
                  onChange({ ...block, items });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-[var(--vo-accent)]"
            onClick={() => onChange({ ...block, items: [...block.items, { value: "", label: "" }] })}
          >
            + Dodaj statistiko
          </button>
        </div>
      );
    case "serviceBlocks":
      return (
        <div className="grid gap-3">
          {block.items.map((item, i) => (
            <div key={item.id} className="rounded-lg border border-[var(--vo-border)] p-3">
              <Field
                label="Naslov"
                value={item.title}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = { ...item, title: v };
                  onChange({ ...block, items });
                }}
              />
              <div className="mt-2">
                <Field
                  label="Besedilo"
                  value={item.body}
                  onChange={(v) => {
                    const items = [...block.items];
                    items[i] = { ...item, body: v };
                    onChange({ ...block, items });
                  }}
                  multiline
                />
              </div>
              <div className="mt-2">{imageKeySelect(item.imageKey, (k) => {
                const items = [...block.items];
                items[i] = { ...item, imageKey: k };
                onChange({ ...block, items });
              })}</div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-[var(--vo-accent)]"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { id: newMarketingId("svc"), title: "", body: "", imageKey: "" }],
              })
            }
          >
            + Dodaj blok
          </button>
        </div>
      );
    case "contactForm":
      return <Field label="Uvod nad obrazcem" value={block.intro} onChange={(v) => onChange({ ...block, intro: v })} multiline />;
    case "cards":
      return (
        <div className="grid gap-3">
          <Field label="Kicker" value={block.kicker} onChange={(v) => onChange({ ...block, kicker: v })} />
          <Field label="Naslov" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <Field label="Podnaslov" value={block.subtitle} onChange={(v) => onChange({ ...block, subtitle: v })} />
          {block.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-[var(--vo-border)] p-3">
              <Field
                label="Naslov kartice"
                value={item.title}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = { ...item, title: v };
                  onChange({ ...block, items });
                }}
              />
              <div className="mt-2">
                <Field
                  label="Besedilo"
                  value={item.body}
                  onChange={(v) => {
                    const items = [...block.items];
                    items[i] = { ...item, body: v };
                    onChange({ ...block, items });
                  }}
                  multiline
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-[var(--vo-accent)]"
            onClick={() => onChange({ ...block, items: [...block.items, { title: "", body: "" }] })}
          >
            + Dodaj kartico
          </button>
        </div>
      );
    default:
      return null;
  }
}

export function BlockListEditor({
  blocks,
  content,
  onChange,
  onUploadImage,
}: {
  blocks: MarketingBlock[];
  content: MarketingSiteContent;
  onChange: (blocks: MarketingBlock[]) => void;
  onUploadImage: (key: string, file: File) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div key={block.id} className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-[var(--vo-muted)]" aria-hidden />
              <span className="text-sm font-bold text-[var(--vo-fg)]">{BLOCK_LABELS[block.type]}</span>
            </div>
            <div className="flex gap-1">
              <button type="button" className="rounded p-1 hover:bg-[var(--vo-surface-2)]" onClick={() => move(i, -1)} aria-label="Gor">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" className="rounded p-1 hover:bg-[var(--vo-surface-2)]" onClick={() => move(i, 1)} aria-label="Dol">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => onChange(blocks.filter((b) => b.id !== block.id))}
                aria-label="Izbriši blok"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <BlockEditor block={block} content={content} onChange={(b) => {
            const next = [...blocks];
            next[i] = b;
            onChange(next);
          }} onUploadImage={onUploadImage} />
        </div>
      ))}
    </div>
  );
}

export { BLOCK_LABELS };
