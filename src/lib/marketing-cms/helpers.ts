import type {
  MarketingBlock,
  MarketingBlockType,
  MarketingButton,
  MarketingImageConfig,
  MarketingRoute,
  MarketingSiteContent,
} from "./types";

export function newMarketingId(prefix = "m"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function routePublicPath(route: MarketingRoute, routes: MarketingRoute[]): string {
  const segments: string[] = [];
  let cur: MarketingRoute | undefined = route;
  const byId = new Map(routes.map((r) => [r.id, r]));
  while (cur) {
    if (cur.slug) segments.unshift(cur.slug);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return segments.length ? `/${segments.join("/")}` : "/";
}

export function createButton(partial?: Partial<MarketingButton>): MarketingButton {
  return {
    id: newMarketingId("btn"),
    label: "Več",
    href: "/kontakt",
    variant: "primary",
    ...partial,
  };
}

export function createBlock(type: MarketingBlockType): MarketingBlock {
  const id = newMarketingId("blk");
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        eyebrow: "",
        title: "",
        titleHighlight: "",
        description: "",
        imageKey: "MARKETING_IMG_HERO",
        ctaPrimary: "Kontakt",
        ctaPrimaryHref: "/kontakt#ponudba",
        ctaSecondary: "Več",
        ctaSecondaryHref: "/storitve",
        trustPills: [],
      };
    case "pageHero":
      return { id, type: "pageHero", eyebrow: "", title: "", description: "" };
    case "text":
      return { id, type: "text", kicker: "", title: "", body: "", align: "left" };
    case "image":
      return { id, type: "image", imageKey: "", caption: "", aspect: "wide" };
    case "split":
      return {
        id,
        type: "split",
        imageKey: "MARKETING_IMG_CCTV",
        kicker: "",
        title: "",
        body: "",
        linkLabel: "",
        linkHref: "",
      };
    case "buttons":
      return { id, type: "buttons", align: "left", items: [createButton()] };
    case "stats":
      return { id, type: "stats", items: [{ value: "100+", label: "Objektov" }] };
    case "cards":
      return { id, type: "cards", kicker: "", title: "", subtitle: "", items: [{ title: "", body: "" }] };
    case "serviceBlocks":
      return {
        id,
        type: "serviceBlocks",
        items: [{ id: newMarketingId("svc"), title: "", body: "", imageKey: "" }],
      };
    case "ctaBand":
      return {
        id,
        type: "ctaBand",
        title: "",
        body: "",
        buttons: [createButton({ variant: "primary" })],
      };
    case "contactForm":
      return { id, type: "contactForm", intro: "" };
    default:
      return { id, type: "text", kicker: "", title: "", body: "", align: "left" };
  }
}

export function createImageSlot(label = "Nova slika"): MarketingImageConfig {
  const key = `IMG_${newMarketingId("img").toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return { key, label, src: "", alt: "", objectFit: "cover", objectPosition: "center" };
}

export function createRoute(partial?: Partial<MarketingRoute>, routes?: MarketingRoute[]): MarketingRoute {
  const parentId = partial?.parentId ?? null;
  const siblings = (routes ?? []).filter((r) => r.parentId === parentId);
  const maxOrder = siblings.reduce((m, r) => Math.max(m, r.navOrder), -1);
  return {
    id: newMarketingId("route"),
    slug: partial?.slug ?? "nova-stran",
    label: partial?.label ?? "Nova stran",
    parentId,
    showInNav: partial?.showInNav ?? true,
    navOrder: partial?.navOrder ?? maxOrder + 1,
    published: partial?.published ?? true,
    blocks: partial?.blocks ?? [createBlock("pageHero"), createBlock("text")],
  };
}

export function buildNavLinks(content: MarketingSiteContent): { href: string; label: string }[] {
  const published = content.routes.filter((r) => r.published && r.showInNav && !r.parentId);
  return published
    .sort((a, b) => a.navOrder - b.navOrder)
    .map((r) => ({ href: routePublicPath(r, content.routes), label: r.label }));
}

export function findRouteBySlugPath(slugParts: string[], routes: MarketingRoute[]): MarketingRoute | null {
  if (slugParts.length === 0) {
    return routes.find((r) => !r.slug && !r.parentId) ?? routes.find((r) => r.id === "route_home") ?? null;
  }
  let parentId: string | null = null;
  let found: MarketingRoute | null = null;
  for (const segment of slugParts) {
    found = routes.find((r) => r.slug === segment && r.parentId === parentId && r.published) ?? null;
    if (!found) return null;
    parentId = found.id;
  }
  return found;
}
