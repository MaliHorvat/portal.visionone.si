import { listClients } from "@/lib/repositories/clients";
import { listReminders } from "@/lib/repositories/reminders";
import { isDbConfigured } from "@/lib/db";
import { OpomnikiView } from "./OpomnikiView";

export const dynamic = "force-dynamic";

export default async function OpomnikiPage() {
  const [reminders, clients] = await Promise.all([listReminders(), listClients()]);
  return (
    <OpomnikiView reminders={reminders} clients={clients} dbConfigured={isDbConfigured()} />
  );
}
