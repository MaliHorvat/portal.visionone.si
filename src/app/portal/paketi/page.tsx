import { listPackages } from "@/lib/repositories/packages";
import { isDbConfigured } from "@/lib/db";
import { PaketiView } from "./PaketiView";

export const dynamic = "force-dynamic";

export default async function PaketiPage() {
  const packages = await listPackages();
  return <PaketiView packages={packages} dbConfigured={isDbConfigured()} />;
}
