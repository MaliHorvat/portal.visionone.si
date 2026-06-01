export type MarketingPageId = "home" | "storitve" | "produkti" | "kontakt";

export type MarketingImageConfig = {
  key: string;
  label: string;
  src: string;
  alt: string;
  widthPercent?: number;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
};

export type MarketingButton = {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
};

export type MarketingBlockType =
  | "hero"
  | "pageHero"
  | "text"
  | "image"
  | "split"
  | "buttons"
  | "stats"
  | "cards"
  | "serviceBlocks"
  | "ctaBand"
  | "contactForm";

export type MarketingBlockBase = { id: string; type: MarketingBlockType };

export type MarketingHeroBlock = MarketingBlockBase & {
  type: "hero";
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  imageKey: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
  trustPills: string[];
};

export type MarketingPageHeroBlock = MarketingBlockBase & {
  type: "pageHero";
  eyebrow: string;
  title: string;
  description: string;
};

export type MarketingTextBlockData = MarketingBlockBase & {
  type: "text";
  kicker: string;
  title: string;
  body: string;
  align: "left" | "center";
};

export type MarketingImageBlock = MarketingBlockBase & {
  type: "image";
  imageKey: string;
  caption: string;
  aspect: "video" | "wide" | "auto";
};

export type MarketingSplitBlock = MarketingBlockBase & {
  type: "split";
  imageKey: string;
  kicker: string;
  title: string;
  body: string;
  linkLabel: string;
  linkHref: string;
};

export type MarketingButtonsBlock = MarketingBlockBase & {
  type: "buttons";
  align: "left" | "center";
  items: MarketingButton[];
};

export type MarketingStatsBlock = MarketingBlockBase & {
  type: "stats";
  items: { value: string; label: string }[];
};

export type MarketingCardsBlock = MarketingBlockBase & {
  type: "cards";
  kicker: string;
  title: string;
  subtitle: string;
  items: { title: string; body: string }[];
};

export type MarketingServiceBlocksBlock = MarketingBlockBase & {
  type: "serviceBlocks";
  items: { id: string; title: string; body: string; imageKey: string }[];
};

export type MarketingCtaBandBlock = MarketingBlockBase & {
  type: "ctaBand";
  title: string;
  body: string;
  buttons: MarketingButton[];
};

export type MarketingContactFormBlock = MarketingBlockBase & {
  type: "contactForm";
  intro: string;
};

export type MarketingBlock =
  | MarketingHeroBlock
  | MarketingPageHeroBlock
  | MarketingTextBlockData
  | MarketingImageBlock
  | MarketingSplitBlock
  | MarketingButtonsBlock
  | MarketingStatsBlock
  | MarketingCardsBlock
  | MarketingServiceBlocksBlock
  | MarketingCtaBandBlock
  | MarketingContactFormBlock;

export type MarketingRoute = {
  id: string;
  /** En segment URL-ja (prazno = koren / pri domači strani). */
  slug: string;
  label: string;
  parentId: string | null;
  showInNav: boolean;
  navOrder: number;
  published: boolean;
  blocks: MarketingBlock[];
};

export type MarketingHeaderCta = {
  label: string;
  href: string;
  show: boolean;
};

/** @deprecated Uporabi routes + blocks. Ohranjeno za združevanje starih zapisov. */
export type MarketingHero = {
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trustPills: string[];
};

export type MarketingTextBlock = {
  kicker?: string;
  title: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
};

export type MarketingStat = { value: string; label: string };

export type MarketingServiceBlock = {
  id: string;
  title: string;
  body: string;
  imageKey: string;
};

export type MarketingPageHero = {
  eyebrow: string;
  title: string;
  description: string;
};

export type MarketingPageContent = {
  hero?: MarketingHero | MarketingPageHero;
  splitCctv?: MarketingTextBlock;
  stats?: MarketingStat[];
  whyIntro?: MarketingTextBlock;
  serviceBlocks?: MarketingServiceBlock[];
  contactIntro?: string;
};

export type MarketingSiteContent = {
  version: number;
  updatedAt: string;
  images: Record<string, MarketingImageConfig>;
  routes: MarketingRoute[];
  headerCta: MarketingHeaderCta;
  pages: Record<MarketingPageId, MarketingPageContent>;
};
