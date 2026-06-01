"use client";

import type { ElementType, ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ORODJA_TOOLS, type OrodjaToolId } from "@/lib/orodja-tools";

type Props = {
  active: string;
};

export function OrodjaToolNav({ active }: Props) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-tool-id="${active}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav ref={navRef} className="vo-tool-nav -mx-1 px-1" aria-label="Izbira orodja">
      {ORODJA_TOOLS.map((t) => {
        const on = active === t.id;
        return (
          <Link
            key={t.id}
            href={`/portal/orodja?tool=${t.id}`}
            scroll={false}
            data-tool-id={t.id}
            className={`vo-tool-nav-item ${on ? "vo-tool-nav-item-active" : ""}`}
            aria-current={on ? "page" : undefined}
          >
            <span className="sm:hidden">{t.mobileLabel}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function OrodjaToolSection({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`vo-tool-section ${className}`.trim()}>
      <div className="flex items-center gap-2 text-[var(--vo-fg)]">
        <Icon className="h-5 w-5 shrink-0 text-[var(--vo-accent)]" aria-hidden />
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type { OrodjaToolId };
