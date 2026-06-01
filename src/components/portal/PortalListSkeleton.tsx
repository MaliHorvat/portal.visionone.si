/** Generičen skeleton za sezname (zahtevki, stranke, opomniki). */
export function PortalListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <div className="vo-shimmer h-3 w-24 rounded" />
        <div className="vo-shimmer h-9 w-56 max-w-full rounded-lg" />
        <div className="vo-shimmer h-4 w-72 max-w-full rounded" />
      </div>
      <div className="vo-shimmer h-11 w-full max-w-lg rounded-lg" />
      <div className="vo-card overflow-hidden p-0">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="vo-shimmer m-3 h-14 rounded-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
