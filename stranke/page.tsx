import { listClients } from "@/lib/repositories/clients";
import { listPackages } from "@/lib/repositories/packages";
import { isDbConfigured } from "@/lib/db";
import { StrankeView } from "./StrankeView";

export const dynamic = "force-dynamic";

export default async function StrankeListPage() {
  const [clients, packages] = await Promise.all([listClients(), listPackages()]);
  return <StrankeView clients={clients} packages={packages} dbConfigured={isDbConfigured()} />;
}
