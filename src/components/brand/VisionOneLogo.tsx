"use client";

import type { VisionOneLogoTone } from "@/lib/brand-assets";

type Props = {
  variant?: "mark" | "wordmark" | "both";
  tone?: VisionOneLogoTone;
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
};

const MARK_SRC = "/visionone-mark.png";
const WORDMARK_SRC = "/visionone-wordmark.png";

function BrandImage({
  src,
  alt,
  className,
  mode,
}: {
  src: string;
  alt: string;
  className: string;
  mode: "light" | "dark" | "auto";
}) {
  const invertDark = "dark:brightness-0 dark:invert";

  if (mode === "light") {
    return <img src={src} alt={alt} className={className} decoding="async" />;
  }

  if (mode === "dark") {
    return (
      <img
        src={src}
        alt={alt}
        className={`${className} brightness-0 invert`}
        decoding="async"
      />
    );
  }

  return (
    <>
      <img src={src} alt={alt} className={`${className} dark:hidden`} decoding="async" />
      <img
        src={src}
        alt={alt || undefined}
        aria-hidden={alt ? true : undefined}
        className={`${className} hidden dark:block ${invertDark}`}
        decoding="async"
      />
    </>
  );
}

function imageMode(tone: VisionOneLogoTone): "light" | "dark" | "auto" {
  if (tone === "on-dark") return "dark";
  if (tone === "on-light") return "light";
  return "auto";
}

export function VisionOneLogo({
  variant = "mark",
  tone = "auto",
  markClassName = "h-9 w-9 shrink-0 object-contain",
  wordmarkClassName = "h-6 w-auto max-w-[148px] object-contain object-left",
  className = "",
}: Props) {
  const mode = imageMode(tone);
  const showMark = variant === "mark" || variant === "both";
  const showWordmark = variant === "wordmark" || variant === "both";

  return (
    <span className={`vo-brand inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {showMark ? (
        <BrandImage
          src={MARK_SRC}
          alt=""
          className={`vo-brand-mark ${markClassName}`}
          mode={mode}
        />
      ) : null}
      {showWordmark ? (
        <BrandImage
          src={WORDMARK_SRC}
          alt="VisionOne"
          className={`vo-brand-wordmark ${wordmarkClassName}`}
          mode={mode}
        />
      ) : null}
    </span>
  );
}
