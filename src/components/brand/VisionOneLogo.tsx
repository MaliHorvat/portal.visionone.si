"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export type VisionOneLogoTone = "auto" | "on-dark" | "on-light";

type Props = {
  /** Samo znak (ščit) ali besedna znamka */
  variant?: "mark" | "wordmark" | "both";
  tone?: VisionOneLogoTone;
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
};

function logoFilterClass(tone: VisionOneLogoTone, resolved: "light" | "dark"): string {
  if (tone === "on-dark") return "vo-brand-on-dark";
  if (tone === "on-light") return "vo-brand-on-light";
  return resolved === "dark" ? "vo-brand-on-dark" : "vo-brand-on-light";
}

export function VisionOneLogo({
  variant = "mark",
  tone = "auto",
  markClassName = "h-9 w-9 shrink-0 object-contain",
  wordmarkClassName = "h-6 w-auto max-w-[140px] object-contain object-left",
  className = "",
}: Props) {
  const { resolved } = useTheme();
  const filter = logoFilterClass(tone, resolved);

  const showMark = variant === "mark" || variant === "both";
  const showWordmark = variant === "wordmark" || variant === "both";

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {showMark ? (
        <img
          src="/visionone-mark.png"
          alt=""
          aria-hidden={variant === "both"}
          className={`${markClassName} ${filter}`}
        />
      ) : null}
      {showWordmark ? (
        <img
          src="/visionone-wordmark.png"
          alt="VisionOne"
          className={`${wordmarkClassName} ${filter}`}
        />
      ) : null}
    </span>
  );
}
