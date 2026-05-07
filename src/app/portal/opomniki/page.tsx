import { getPortalSession } from "@/lib/get-portal-session";
import { listClientsForSession } from "@/lib/repositories/clients";
import { listRemindersForSession } from "@/lib/repositories/reminders";
import { isDbConfigured } from "@/lib/db";
import { OpomnikiView } from "./OpomnikiView";

export const dynamic = "force-dynamic";

export default async function OpomnikiPage() {
  const session = await getPortalSession();
  const [reminders, clients] = await Promise.all([
    listRemindersForSession(session ?? undefined),
    listClientsForSession(session ?? undefined),
  ]);
  return (
    <OpomnikiView reminders={reminders} clients={clients} dbConfigured={isDbConfigured()} />
  );
}
