/** Skeleton za nadzorno ploščo — prikaže se takoj, preden pridejo podatki iz API-ja. */
export function PortalDashboardSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <div className="vo-card p-5 md:p-6">
        <div className="vo-shimmer h-4 w-32 rounded" />
        <div className="vo-shimmer mt-3 h-9 w-64 max-w-full rounded-lg" />
        <div className="vo-shimmer mt-2 h-4 w-48 rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <div className="vo-shimmer h-36 w-[260px] shrink-0 rounded-xl" />
        <div className="vo-shimmer h-36 w-[260px] shrink-0 rounded-xl" />
        <div className="vo-shimmer h-36 w-[260px] shrink-0 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="vo-shimmer h-44 rounded-xl" />
        <div className="vo-shimmer h-44 rounded-xl" />
      </div>
    </div>
  );
}
