export type MarketingPageId = "home" | "storitve" | "produkti" | "kontakt";

export type MarketingImageConfig = {
  key: string;
  label: string;
  src: string;
  alt: string;
  /** 0–100 — širina prikaza v % (opcijsko) */
  widthPercent?: number;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
};

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
  pages: Record<MarketingPageId, MarketingPageContent>;
};
