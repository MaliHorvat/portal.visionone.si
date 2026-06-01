export default function PortalLoading() {
  return (
    <div className="space-y-6 pb-10">
      <div className="vo-shimmer h-10 w-64 max-w-full rounded-xl" />
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
