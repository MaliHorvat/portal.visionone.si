import { listClients } from "@/lib/repositories/clients";
import { listPackages } from "@/lib/repositories/packages";
import { isDbConfigured } from "@/lib/db";
import { getMockClients, mockPackages } from "@/lib/mock-data";
import { StrankeView } from "./StrankeView";

export const dynamic = "force-dynamic";

function mockSummaries() {
  return getMockClients().map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    address: c.address,
    contact: c.contact,
    email: c.email,
    package: c.package,
    health: c.health,
  }));
}

export default async function StrankeListPage() {
  const envDb = isDbConfigured();
  let clients = mockSummaries();
  let packages = mockPackages;
  let loadError: string | null = null;
  let dbConfigured = envDb;

  try {
    [clients, packages] = await Promise.all([listClients(), listPackages()]);
  } catch (err) {
    console.error("[portal/stranke] DB load failed:", err);
    clients = mockSummaries();
    packages = mockPackages;
    dbConfigured = false;
    loadError =
      "Podatkov iz baze ni bilo mogoče naložiti (najpogosteje: produkcijska shema ne ustreza tej različici aplikacije). Zaženite posodobitev sheme proti istemu DATABASE_URL kot na Vercelu (npr. npm run db:push). Podrobnosti so v strežniških dnevnikih (Vercel → Logs). Prikazani so začasni demo podatki.";
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
