import { PortalDashboardView } from "@/components/portal/PortalDashboardView";
import { getPortalSession } from "@/lib/get-portal-session";
import { getPortalDashboard, type PortalDashboardPayload } from "@/lib/repositories/dashboard";
import { isPrismaJsonParseError, repairAllJsonColumns } from "@/lib/db-json-repair";

export const dynamic = "force-dynamic";

export default async function PortalDashboardRoutePage() {
  const session = await getPortalSession();
  let initial: PortalDashboardPayload;
  try {
    initial = await getPortalDashboard(session ?? undefined);
  } catch (err) {
    console.error("[portal] dashboard load failed:", err);
    if (isPrismaJsonParseError(err)) {
      try {
        await repairAllJsonColumns();
        initial = await getPortalDashboard(session ?? undefined);
      } catch (retryErr) {
        console.error("[portal] dashboard retry failed:", retryErr);
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
  return <PortalDashboardView initial={initial} />;
}
