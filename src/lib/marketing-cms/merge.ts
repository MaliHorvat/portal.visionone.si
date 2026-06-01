import { DEFAULT_MARKETING_SITE_CONTENT } from "./default-content";
import type { MarketingSiteContent } from "./types";

/** Združi shranjeno vsebino z privzetimi vrednostmi (manjkajoča polja). */
export function mergeMarketingContent(partial: unknown): MarketingSiteContent {
  const base = structuredClone(DEFAULT_MARKETING_SITE_CONTENT);
  if (!partial || typeof partial !== "object") return base;
  const p = partial as MarketingSiteContent;
  if (p.images && typeof p.images === "object") {
    for (const [k, v] of Object.entries(p.images)) {
      if (v && typeof v === "object" && "src" in v) {
        base.images[k] = { ...base.images[k], ...v, key: k };
      }
    }
  }
  if (p.pages && typeof p.pages === "object") {
    for (const pageId of Object.keys(base.pages) as (keyof typeof base.pages)[]) {
      const saved = p.pages[pageId];
      if (!saved || typeof saved !== "object") continue;
      base.pages[pageId] = { ...base.pages[pageId], ...saved };
      if (saved.hero && base.pages[pageId].hero) {
        base.pages[pageId].hero = { ...base.pages[pageId].hero!, ...saved.hero };
      }
      if (saved.splitCctv && base.pages[pageId].splitCctv) {
        base.pages[pageId].splitCctv = { ...base.pages[pageId].splitCctv!, ...saved.splitCctv };
      }
      if (saved.whyIntro) base.pages[pageId].whyIntro = { ...base.pages[pageId].whyIntro, ...saved.whyIntro };
      if (Array.isArray(saved.stats)) base.pages[pageId].stats = saved.stats;
      if (Array.isArray(saved.serviceBlocks)) base.pages[pageId].serviceBlocks = saved.serviceBlocks;
      if (saved.contactIntro) base.pages[pageId].contactIntro = saved.contactIntro;
    }
  }
  if (typeof p.version === "number") base.version = p.version;
  if (typeof p.updatedAt === "string") base.updatedAt = p.updatedAt;
  return base;
}
