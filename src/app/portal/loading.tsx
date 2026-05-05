export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-9 w-56 max-w-full rounded-lg bg-[var(--vo-surface-2)]" />
      <div className="h-40 rounded-xl bg-[var(--vo-surface-2)]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 rounded-xl bg-[var(--vo-surface-2)]" />
        <div className="h-32 rounded-xl bg-[var(--vo-surface-2)]" />
      </div>
    </div>
  );
}
