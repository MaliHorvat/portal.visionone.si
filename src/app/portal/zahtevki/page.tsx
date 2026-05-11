import { isDbConfigured } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { listClientsForSession } from "@/lib/repositories/clients";
import { listServiceRequestsForSession } from "@/lib/repositories/service-requests";
import { ZahtevkiView } from "./ZahtevkiView";

export const dynamic = "force-dynamic";

export default async function ZahtevkiPage() {
  const session = await getPortalSession();
  const [requests, clients] = await Promise.all([
    listServiceRequestsForSession(session ?? undefined),
    listClientsForSession(session ?? undefined),
  ]);
  return <ZahtevkiView requests={requests} clients={clients} dbConfigured={isDbConfigured()} />;
}

