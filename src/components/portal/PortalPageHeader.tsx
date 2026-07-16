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
    <header className={`vo-page-header mb-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {kicker ? <p className="vo-eyebrow">{kicker}</p> : null}
          <h1 className={`vo-page-title ${kicker ? "mt-1" : ""} ${gradientTitle ? "vo-page-title-gradient" : ""}`}>
            {title}
          </h1>
          {description ? <div className="vo-page-desc mt-1.5 text-sm">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
