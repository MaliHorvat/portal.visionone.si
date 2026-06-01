import { PortalListSkeleton } from "@/components/portal/PortalListSkeleton";

/** Kratek skeleton med prehodi — stran sama naloži podatke. */
export default function PortalLoading() {
  return <PortalListSkeleton rows={6} />;
}
