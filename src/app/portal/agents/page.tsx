import { getPortalSession } from "@/lib/get-portal-session";
import { listClientsForSession } from "@/lib/repositories/clients";
import { isDbConfigured } from "@/lib/db";
import { AgentsView } from "./AgentsView";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await getPortalSession();
  const clients = await listClientsForSession(session ?? undefined);
  return <AgentsView clients={clients} dbConfigured={isDbConfigured()} />;
}
