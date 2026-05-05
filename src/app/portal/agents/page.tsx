import { listClients } from "@/lib/repositories/clients";
import { isDbConfigured } from "@/lib/db";
import { AgentsView } from "./AgentsView";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const clients = await listClients();
  return <AgentsView clients={clients} dbConfigured={isDbConfigured()} />;
}
