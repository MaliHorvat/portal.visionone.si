import { isDbConfigured } from "@/lib/db";
import { KerberosHubView } from "./KerberosHubView";

export const dynamic = "force-dynamic";

export default function KerberosHubPage() {
  return <KerberosHubView dbConfigured={isDbConfigured()} />;
}

