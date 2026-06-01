import { listClientsForSession } from "@/lib/repositories/clients";
import { listRemindersForSession } from "@/lib/repositories/reminders";
import { listServiceRequestsForSession } from "@/lib/repositories/service-requests";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import type { ClientSummary, MaintenanceReminder, ServiceRequest } from "@/lib/types";

export type MojOverview = {
  client: ClientSummary | null;
  upcomingReminders: MaintenanceReminder[];
  openRequests: ServiceRequest[];
  recentRequests: ServiceRequest[];
};

export async function getMojOverview(session?: PortalSessionPayload): Promise<MojOverview> {
  const clients = await listClientsForSession(session);
  const client = clients[0] ?? null;
  if (!client) {
    return { client: null, upcomingReminders: [], openRequests: [], recentRequests: [] };
  }

  const [reminders, requests] = await Promise.all([
    listRemindersForSession(session, client.id),
    listServiceRequestsForSession(session),
  ]);

  const forClient = requests.filter((r) => r.clientId === client.id);
  const openRequests = forClient.filter((r) => r.status !== "done");
  const upcomingReminders = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
  const recentRequests = [...forClient]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return { client, upcomingReminders, openRequests, recentRequests };
}
