import type { ReactNode } from "react";

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PortalPageHeader({ kicker, title, description, actions, className = "" }: Props) {
  return (
    <header className={`vo-page-header mb-6 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 max-w-3xl">
        {kicker ? <p className="vo-section-label">{kicker}</p> : null}
        <h1 className="vo-page-title">{title}</h1>
        {description ? <p className="vo-page-desc mt-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
