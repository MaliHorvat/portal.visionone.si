import { PortalDashboardView } from "@/components/portal/PortalDashboardView";
import { getPortalDashboard } from "@/lib/repositories/dashboard";

export const dynamic = "force-dynamic";

export default async function PortalDashboardRoutePage() {
  const initial = await getPortalDashboard();
  return <PortalDashboardView initial={initial} />;
}
