import { PortalDashboardView } from "@/components/portal/PortalDashboardView";
import { getPortalSession } from "@/lib/get-portal-session";
import { getPortalDashboard } from "@/lib/repositories/dashboard";

export const dynamic = "force-dynamic";

export default async function PortalDashboardRoutePage() {
  const session = await getPortalSession();
  const initial = await getPortalDashboard(session ?? undefined);
  return <PortalDashboardView initial={initial} />;
}
