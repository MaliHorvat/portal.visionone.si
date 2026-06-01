"use client";

import { BRAND_LOGO_SRC, BRAND_WORDMARK_SRC, type VisionOneLogoTone } from "@/lib/brand-assets";

type BrandSize = "sm" | "md";

const SIZE_PRESETS: Record<
  BrandSize,
  { mark: string; wordmark: string; gap: string; markW: number; markH: number; wordW: number; wordH: number }
> = {
  sm: {
    mark: "h-7 w-7 shrink-0 object-contain",
    wordmark: "h-5 max-h-5 w-auto min-w-0 flex-1 object-contain object-left",
    gap: "gap-1.5",
    markW: 28,
    markH: 28,
    wordW: 160,
    wordH: 20,
  },
  md: {
    mark: "h-8 w-8 shrink-0 object-contain",
    wordmark: "h-4 w-auto max-w-[7rem] shrink object-contain object-left",
    gap: "gap-2",
    markW: 32,
    markH: 32,
    wordW: 112,
    wordH: 16,
  },
};

type Props = {
  variant?: "mark" | "wordmark" | "both";
  tone?: VisionOneLogoTone;
  size?: BrandSize;
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
};

function toneClass(tone: VisionOneLogoTone): string {
  if (tone === "on-dark") return "vo-brand--on-dark";
  if (tone === "on-light") return "vo-brand--on-light";
  return "vo-brand--auto";
}

export function VisionOneLogo({
  variant = "mark",
  tone = "auto",
  size = "md",
  markClassName,
  wordmarkClassName,
  className = "",
}: Props) {
  const preset = SIZE_PRESETS[size];
  const showMark = variant === "mark" || variant === "both";
  const showWordmark = variant === "wordmark" || variant === "both";

  return (
    <span
      className={`vo-brand ${toneClass(tone)} inline-flex min-w-0 max-w-full items-center ${preset.gap} ${className}`}
    >
      {showMark ? (
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          width={preset.markW}
          height={preset.markH}
          decoding="async"
          aria-hidden={variant === "both"}
          className={`vo-brand-img vo-brand-mark ${markClassName ?? preset.mark}`}
        />
      ) : null}
      {showWordmark ? (
        <img
          src={BRAND_WORDMARK_SRC}
          alt="VisionOne"
          width={preset.wordW}
          height={preset.wordH}
          decoding="async"
          className={`vo-brand-img vo-brand-wordmark ${wordmarkClassName ?? preset.wordmark}`}
        />
      ) : null}
    </span>
  );
}
