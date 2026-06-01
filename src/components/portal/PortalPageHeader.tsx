import type { ReactNode } from "react";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  gradientTitle?: boolean;
};

export function PortalPageHeader({
  kicker,
  title,
  description,
  actions,
  className = "",
  gradientTitle = false,
}: Props) {
  return (
    <header
      className={`vo-page-header vo-card vo-visual-band relative mb-6 overflow-hidden p-6 md:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 vo-mesh-bg opacity-50" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {kicker ? <p className="vo-eyebrow">{kicker}</p> : null}
          <h1 className={`mt-2 vo-page-title ${gradientTitle ? "vo-page-title-gradient" : ""}`}>{title}</h1>
          {description ? <div className="vo-page-desc mt-3">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
