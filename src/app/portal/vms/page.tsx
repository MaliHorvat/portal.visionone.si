import { VmsAdminView } from "@/app/portal/vms/VmsAdminView";
import { listVmsAdminOverview } from "@/lib/repositories/vms-admin";

export const dynamic = "force-dynamic";

export default async function VmsAdminPage() {
  const overview = await listVmsAdminOverview();
  return <VmsAdminView initial={overview} />;
}
