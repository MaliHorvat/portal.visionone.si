import { StandaloneRackDesigner } from "@/components/portal/StandaloneRackDesigner";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function RackDizajnerPage() {
  return <StandaloneRackDesigner dbConfigured={isDbConfigured()} />;
}
