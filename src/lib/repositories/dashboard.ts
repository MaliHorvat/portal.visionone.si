import { prisma, isDbConfigured } from "@/lib/db";
import { getMockClients, mockReminders, mockSystemEvents } from "@/lib/mock-data";
import { listAuditLogs } from "@/lib/repositories/audit-log";
import { listReminders } from "@/lib/repositories/reminders";

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
  };
  appVersion: string;
};

function isDiskOk(h: string): boolean {
  return h === "ok";
}

function buildCardFromDetail(c: {
  id: string;
  name: string;
  health: string;
  cameras: Array<{ name: string; ip: string; status: string }>;
  nvrs: Array<{ name: string; status: string }>;
  switches: Array<{ name: string; status: string }>;
  disks: Array<{ label: string; health: string }>;
}): ClientDashboardCard {
  const camerasTotal = c.cameras.length;
  const camerasOnline = c.cameras.filter((x) => x.status === "online").length;
  const nvrsTotal = c.nvrs.length;
  const nvrsOnline = c.nvrs.filter((x) => x.status === "online").length;
  const switchesTotal = c.switches.length;
  const switchesOnline = c.switches.filter((x) => x.status === "online").length;
  const disksTotal = c.disks.length;
  const disksOk = c.disks.filter((d) => isDiskOk(d.health)).length;

  const issues: string[] = [];
  for (const cam of c.cameras) {
    if (cam.status !== "online") {
      issues.push(`Kamera ${cam.name || cam.ip || "?"} — offline`);
    }
  }
  for (const n of c.nvrs) {
    if (n.status !== "online") issues.push(`NVR ${n.name} — offline`);
  }
  for (const s of c.switches) {
    if (s.status !== "online") issues.push(`Switch ${s.name} — offline`);
  }
  for (const d of c.disks) {
    if (!isDiskOk(d.health)) issues.push(`Disk ${d.label} — ${d.health}`);
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

export async function getPortalDashboard(): Promise<PortalDashboardPayload> {
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
      appVersion,
    };
  }

  const rows = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      cameras: true,
      recorders: true,
      switches: true,
      disks: true,
    },
  });

  const clients = rows.map((row) =>
    buildCardFromDetail({
      id: row.id,
      name: row.name,
      health: row.health,
      cameras: row.cameras.map((cam) => ({
        name: cam.name,
        ip: cam.ip,
        status: cam.status,
      })),
      nvrs: row.recorders.map((n) => ({ name: n.name, status: n.status })),
      switches: row.switches.map((s) => ({ name: s.name, status: s.status })),
      disks: row.disks.map((d) => ({ label: d.label, health: d.health })),
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
    },
  );

  const remindersRaw = await listReminders();
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

  const audits = await listAuditLogs(14);
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
    activities,
    totals,
    appVersion,
  };
}
