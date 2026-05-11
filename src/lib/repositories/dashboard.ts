import { prisma, isDbConfigured } from "@/lib/db";
import { getMockClients, mockReminders, mockSystemEvents } from "@/lib/mock-data";
import { listAuditLogs } from "@/lib/repositories/audit-log";
import { listRemindersForSession } from "@/lib/repositories/reminders";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";

export type ClientDashboardCard = {
  id: string;
  name: string;
  state: "ok" | "alarm";
  camerasOnline: number;
  camerasTotal: number;
  nvrsOnline: number;
  nvrsTotal: number;
  switchesOnline: number;
  switchesTotal: number;
  disksOk: number;
  disksTotal: number;
  issues: string[];
};

export type DashboardActivity = {
  id: string;
  at: string;
  message: string;
  level: "info" | "warn" | "error";
};

export type PortalDashboardPayload = {
  dbConfigured: boolean;
  clients: ClientDashboardCard[];
  reminders: Array<{
    id: string;
    title: string;
    dueDate: string;
    clientName: string;
    completed: boolean;
  }>;
  activities: DashboardActivity[];
  requests: Array<{
    id: string;
    title: string;
    clientName: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
  totals: {
    clients: number;
    camerasOnline: number;
    camerasOffline: number;
    nvrsOnline: number;
    nvrsOffline: number;
    switchesOnline: number;
    switchesOffline: number;
    disksOk: number;
    disksWarnFail: number;
    requestsOpen: number;
    requestsUrgent: number;
  };
  appVersion: string;
};

function isDiskOk(h: string): boolean {
  return h === "ok";
}

function diskAgeLevel(installedAt: string): "ok" | "warn" | "fail" {
  const raw = installedAt.trim();
  if (!raw) return "ok";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "ok";
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years >= 3) return "fail";
  if (years >= 2) return "warn";
  return "ok";
}

function buildCardFromDetail(c: {
  id: string;
  name: string;
  health: string;
  cameras: Array<{ id?: string; name: string; ip: string; status: string }>;
  nvrs: Array<{ id?: string; name: string; status: string }>;
  switches: Array<{ id?: string; name: string; status: string }>;
  disks: Array<{ label: string; health: string; installedAt?: string }>;
  live?: Record<string, string>;
}): ClientDashboardCard {
  const camerasTotal = c.cameras.length;
  const camerasOnline = c.cameras.filter((x) => (x.id ? (c.live?.[`cam:${x.id}`] ?? x.status) : x.status) === "online").length;
  const nvrsTotal = c.nvrs.length;
  const nvrsOnline = c.nvrs.filter((x) => (x.id ? (c.live?.[`nvr:${x.id}`] ?? x.status) : x.status) === "online").length;
  const switchesTotal = c.switches.length;
  const switchesOnline = c.switches.filter((x) => (x.id ? (c.live?.[`sw:${x.id}`] ?? x.status) : x.status) === "online").length;
  const disksTotal = c.disks.length;
  const disksOk = c.disks.filter((d) => isDiskOk(d.health) && diskAgeLevel(d.installedAt ?? "") === "ok").length;

  const issues: string[] = [];
  for (const cam of c.cameras) {
    const st = cam.id ? (c.live?.[`cam:${cam.id}`] ?? cam.status) : cam.status;
    if (st !== "online") {
      issues.push(`Kamera ${cam.name || cam.ip || "?"} — offline`);
    }
  }
  for (const n of c.nvrs) {
    const st = n.id ? (c.live?.[`nvr:${n.id}`] ?? n.status) : n.status;
    if (st !== "online") issues.push(`NVR ${n.name} — offline`);
  }
  for (const s of c.switches) {
    const st = s.id ? (c.live?.[`sw:${s.id}`] ?? s.status) : s.status;
    if (st !== "online") issues.push(`Switch ${s.name} — offline`);
  }
  for (const d of c.disks) {
    const age = diskAgeLevel(d.installedAt ?? "");
    if (!isDiskOk(d.health) || age !== "ok") issues.push(`Disk ${d.label} — ${age === "fail" ? "nujna menjava" : age === "warn" ? "priporočena menjava" : d.health}`);
  }

  const alarm =
    c.health === "alarm" ||
    camerasOnline < camerasTotal ||
    nvrsOnline < nvrsTotal ||
    switchesOnline < switchesTotal ||
    disksOk < disksTotal;

  return {
    id: c.id,
    name: c.name,
    state: alarm ? "alarm" : "ok",
    camerasOnline,
    camerasTotal,
    nvrsOnline,
    nvrsTotal,
    switchesOnline,
    switchesTotal,
    disksOk,
    disksTotal,
    issues: issues.slice(0, 6),
  };
}

export async function getPortalDashboard(
  session?: Pick<PortalSessionPayload, "role" | "username">,
): Promise<PortalDashboardPayload> {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.2.0";

  if (!isDbConfigured() || !prisma) {
    const clients = getMockClients().map((c) =>
      buildCardFromDetail({
        id: c.id,
        name: c.name,
        health: c.health,
        cameras: c.cameras.map((x) => ({ name: x.name, ip: x.ip, status: x.status })),
        nvrs: c.nvrs.map((x) => ({ name: x.name, status: x.status })),
        switches: c.switches.map((x) => ({ name: x.name, status: x.status })),
        disks: c.disks.map((x) => ({ label: x.label, health: x.health })),
      }),
    );
    const totals = clients.reduce(
      (acc, x) => ({
        clients: acc.clients + 1,
        camerasOnline: acc.camerasOnline + x.camerasOnline,
        camerasOffline: acc.camerasOffline + (x.camerasTotal - x.camerasOnline),
        nvrsOnline: acc.nvrsOnline + x.nvrsOnline,
        nvrsOffline: acc.nvrsOffline + (x.nvrsTotal - x.nvrsOnline),
        switchesOnline: acc.switchesOnline + x.switchesOnline,
        switchesOffline: acc.switchesOffline + (x.switchesTotal - x.switchesOnline),
        disksOk: acc.disksOk + x.disksOk,
        disksWarnFail: acc.disksWarnFail + (x.disksTotal - x.disksOk),
        requestsOpen: acc.requestsOpen,
        requestsUrgent: acc.requestsUrgent,
      }),
      {
        clients: 0,
        camerasOnline: 0,
        camerasOffline: 0,
        nvrsOnline: 0,
        nvrsOffline: 0,
        switchesOnline: 0,
        switchesOffline: 0,
        disksOk: 0,
        disksWarnFail: 0,
        requestsOpen: 0,
        requestsUrgent: 0,
      },
    );
    return {
      dbConfigured: false,
      clients,
      reminders: mockReminders
        .filter((r) => !r.completed)
        .slice(0, 12)
        .map((r) => ({
          id: r.id,
          title: r.title,
          dueDate: r.dueDate,
          clientName: r.clientName,
          completed: r.completed,
        })),
      activities: mockSystemEvents.map((e) => ({
        id: e.id,
        at: e.at,
        message: e.message,
        level: e.level,
      })),
      totals,
      requests: [],
      appVersion,
    };
  }

  const owner = session?.username?.trim();
  const clientWhere = owner
    ? { ownerUsername: owner }
    : { ownerUsername: "__portal_no_owner__" };
  const [rows, probes, remindersRaw, audits, requestsRows] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        health: true,
        cameras: { select: { id: true, name: true, ip: true, status: true } },
        recorders: { select: { id: true, name: true, status: true } },
        switches: { select: { id: true, name: true, status: true } },
        disks: { select: { label: true, health: true, installedAt: true } },
      },
    }),
    prisma.deviceProbe.findMany({
      where: {
        ...(owner
          ? { client: { ownerUsername: owner } }
          : { client: { ownerUsername: "__portal_no_owner__" } }),
        OR: [{ kind: "camera" }, { kind: "nvr" }, { kind: "switch" }],
      },
      select: { clientId: true, deviceKey: true, status: true },
    }),
    listRemindersForSession(session ?? undefined),
    listAuditLogs(8, owner ?? undefined),
    prisma.serviceRequest.findMany({
      where: { ownerUsername: owner ?? "__portal_no_owner__" },
      include: { client: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
  ]);
  const liveByClient = new Map<string, Record<string, string>>();
  for (const p of probes) {
    if (!p.clientId) continue;
    const curr = liveByClient.get(p.clientId) ?? {};
    curr[p.deviceKey] = p.status;
    liveByClient.set(p.clientId, curr);
  }

  const clients = rows.map((row) =>
    buildCardFromDetail({
      id: row.id,
      name: row.name,
      health: row.health,
      cameras: row.cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        ip: cam.ip,
        status: cam.status,
      })),
      nvrs: row.recorders.map((n) => ({ id: n.id, name: n.name, status: n.status })),
      switches: row.switches.map((s) => ({ id: s.id, name: s.name, status: s.status })),
      disks: row.disks.map((d) => ({ label: d.label, health: d.health, installedAt: d.installedAt })),
      live: liveByClient.get(row.id),
    }),
  );

  const totals = clients.reduce(
    (acc, x) => ({
      clients: acc.clients + 1,
      camerasOnline: acc.camerasOnline + x.camerasOnline,
      camerasOffline: acc.camerasOffline + (x.camerasTotal - x.camerasOnline),
      nvrsOnline: acc.nvrsOnline + x.nvrsOnline,
      nvrsOffline: acc.nvrsOffline + (x.nvrsTotal - x.nvrsOnline),
      switchesOnline: acc.switchesOnline + x.switchesOnline,
      switchesOffline: acc.switchesOffline + (x.switchesTotal - x.switchesOnline),
      disksOk: acc.disksOk + x.disksOk,
      disksWarnFail: acc.disksWarnFail + (x.disksTotal - x.disksOk),
      requestsOpen: acc.requestsOpen,
      requestsUrgent: acc.requestsUrgent,
    }),
    {
      clients: 0,
      camerasOnline: 0,
      camerasOffline: 0,
      nvrsOnline: 0,
      nvrsOffline: 0,
      switchesOnline: 0,
      switchesOffline: 0,
      disksOk: 0,
      disksWarnFail: 0,
      requestsOpen: 0,
      requestsUrgent: 0,
    },
  );
  const requests = requestsRows.map((r) => ({
    id: r.id,
    title: r.title,
    clientName: r.client?.name ?? "",
    status: r.status,
    priority: r.priority,
    dueDate: r.dueDate,
  }));
  const requestsOpen = requests.filter((r) => r.status !== "done").length;
  const requestsUrgent = requests.filter((r) => r.priority === "urgent" && r.status !== "done").length;

  const reminders = remindersRaw
    .filter((r) => !r.completed)
    .slice(0, 12)
    .map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      clientName: r.clientName,
      completed: r.completed,
    }));

  const activities: DashboardActivity[] = audits.map((a) => {
    let level: DashboardActivity["level"] = "info";
    if (/delete|error|fail|403|401/i.test(a.action + a.details)) level = "error";
    else if (/warn|reject/i.test(a.action + a.details)) level = "warn";
    return {
      id: String(a.id),
      at: a.createdAt.toISOString(),
      message: `${a.username ? `${a.username}: ` : ""}${a.action}${a.details ? ` — ${a.details.slice(0, 140)}` : ""}`,
      level,
    };
  });

  return {
    dbConfigured: true,
    clients,
    reminders,
    requests,
    activities,
    totals: { ...totals, requestsOpen, requestsUrgent },
    appVersion,
  };
}
