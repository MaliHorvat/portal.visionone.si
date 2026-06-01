"use client";

import { BRAND_LOGO_SRC, BRAND_WORDMARK_SRC, type VisionOneLogoTone } from "@/lib/brand-assets";

type Props = {
  variant?: "mark" | "wordmark" | "both";
  tone?: VisionOneLogoTone;
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
  markClassName = "h-9 w-9 shrink-0 object-contain",
  wordmarkClassName = "h-6 w-auto max-w-[148px] object-contain object-left",
  className = "",
}: Props) {
  const showMark = variant === "mark" || variant === "both";
  const showWordmark = variant === "wordmark" || variant === "both";

  return (
    <span className={`vo-brand ${toneClass(tone)} inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {showMark ? (
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          width={36}
          height={42}
          decoding="async"
          aria-hidden={variant === "both"}
          className={`vo-brand-img vo-brand-mark ${markClassName}`}
        />
      ) : null}
      {showWordmark ? (
        <img
          src={BRAND_WORDMARK_SRC}
          alt="VisionOne"
          width={148}
          height={24}
          decoding="async"
          className={`vo-brand-img vo-brand-wordmark ${wordmarkClassName}`}
        />
      ) : null}
    </span>
  );
}
