import { isDbConfigured } from "@/lib/db";
import { VmsView } from "./VmsView";

export const dynamic = "force-dynamic";

export default function VmsPage() {
  return <VmsView dbConfigured={isDbConfigured()} />;
}

