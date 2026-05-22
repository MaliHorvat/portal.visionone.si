import { listPackages } from "@/lib/repositories/packages";
import { isDbConfigured } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { getMockClients, mockPackages } from "@/lib/mock-data";
import { StrankeView } from "./StrankeView";
import { formatDbLoadError } from "@/lib/db-load-error";
import { listClientsForSession } from "@/lib/repositories/clients";

export const dynamic = "force-dynamic";

function mockSummaries() {
  return getMockClients().map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    address: c.address,
    contact: c.contact,
    phone: c.phone,
    email: c.email,
    package: c.package,
    health: c.health,
    tags: c.tags ?? [],
  }));
}

export default async function StrankeListPage() {
  const session = await getPortalSession();
  const envDb = isDbConfigured();
  let clients = mockSummaries();
  let packages = mockPackages;
  let loadError: string | null = null;
  let dbConfigured = envDb;

  if (envDb) {
    try {
      clients = await listClientsForSession(session ?? undefined);
    } catch (err) {
      console.error("[portal/stranke] clients load failed:", err);
      clients = mockSummaries();
      dbConfigured = false;
      loadError = formatDbLoadError(err);
    }
    if (!loadError) {
      try {
        packages = await listPackages();
      } catch (err) {
        console.error("[portal/stranke] packages load failed:", err);
        packages = mockPackages;
        dbConfigured = false;
        loadError = formatDbLoadError(err);
      }
    }
  }

  return (
    <StrankeView
      clients={clients}
      packages={packages}
      dbConfigured={dbConfigured}
      loadError={loadError}
    />
  );
}
