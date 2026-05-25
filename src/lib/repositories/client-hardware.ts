import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

/** TCP dosegljivost — vrne true če je vrata odprta (strežnik mora videti ciljni IP). */
export async function probeTcpPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  const net = await import("net");
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (ok: boolean) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

export async function createCamera(
  clientId: string,
  data: {
    tag?: string;
    name: string;
    ip?: string;
    rtspUser?: string;
    rtspPass?: string;
    model?: string;
    comment?: string;
    checkPort?: number | null;
    streamUrl?: string;
    frigateCameraKey?: string;
  },
) {
  requireDb();
  return prisma!.clientCamera.create({
    data: {
      clientId,
      tag: data.tag ?? "",
      name: data.name,
      ip: data.ip ?? "",
      rtspUser: data.rtspUser ?? "",
      rtspPass: data.rtspPass ?? "",
      model: data.model ?? "",
      comment: data.comment ?? "",
      checkPort: data.checkPort ?? null,
      streamUrl: data.streamUrl ?? "",
      frigateCameraKey: data.frigateCameraKey ?? "",
      status: "offline",
    },
  });
}

export async function updateCamera(
  cameraId: string,
  data: Partial<{
    tag: string;
    name: string;
    ip: string;
    rtspUser: string;
    rtspPass: string;
    model: string;
    comment: string;
    status: string;
    checkPort: number | null;
    streamUrl: string;
    frigateCameraKey: string;
  }>,
) {
  requireDb();
  return prisma!.clientCamera.update({
    where: { id: cameraId },
    data,
  });
}

export async function deleteCamera(cameraId: string) {
  requireDb();
  await prisma!.clientCamera.delete({ where: { id: cameraId } });
}

export async function createRecorder(
  clientId: string,
  data: {
    name: string;
    ip?: string;
    model?: string;
    comment?: string;
    diskTb?: number;
  },
) {
  requireDb();
  return prisma!.clientRecorder.create({
    data: {
      clientId,
      name: data.name,
      ip: data.ip ?? "",
      model: data.model ?? "",
      comment: data.comment ?? "",
      diskTb: data.diskTb ?? 0,
      status: "offline",
    },
  });
}

export async function updateRecorder(
  id: string,
  data: Partial<{ name: string; ip: string; model: string; comment: string; status: string; diskTb: number }>,
) {
  requireDb();
  return prisma!.clientRecorder.update({ where: { id }, data });
}

export async function deleteRecorder(id: string) {
  requireDb();
  await prisma!.clientRecorder.delete({ where: { id } });
}

export async function createSwitch(
  clientId: string,
  data: { name: string; ip?: string; model?: string; comment?: string; ports?: number },
) {
  requireDb();
  return prisma!.clientSwitch.create({
    data: {
      clientId,
      name: data.name,
      ip: data.ip ?? "",
      model: data.model ?? "",
      comment: data.comment ?? "",
      ports: data.ports ?? 0,
      status: "offline",
    },
  });
}

export async function updateSwitch(
  id: string,
  data: Partial<{ name: string; ip: string; model: string; comment: string; status: string; ports: number }>,
) {
  requireDb();
  return prisma!.clientSwitch.update({ where: { id }, data });
}

export async function deleteSwitch(id: string) {
  requireDb();
  await prisma!.clientSwitch.delete({ where: { id } });
}

export async function createDisk(
  clientId: string,
  data: {
    label: string;
    ip?: string;
    model?: string;
    serial?: string;
    sizeTb?: number;
    installedAt?: string;
    comment?: string;
    health?: string;
  },
) {
  requireDb();
  return prisma!.clientDisk.create({
    data: {
      clientId,
      label: data.label,
      ip: data.ip ?? "",
      model: data.model ?? "",
      serial: data.serial ?? "",
      sizeTb: data.sizeTb ?? 0,
      installedAt: data.installedAt ?? "",
      comment: data.comment ?? "",
      health: data.health ?? "ok",
    },
  });
}

export async function updateDisk(
  id: string,
  data: Partial<{
    label: string;
    ip: string;
    model: string;
    serial: string;
    sizeTb: number;
    installedAt: string;
    comment: string;
    health: string;
  }>,
) {
  requireDb();
  return prisma!.clientDisk.update({ where: { id }, data });
}

export async function deleteDisk(id: string) {
  requireDb();
  await prisma!.clientDisk.delete({ where: { id } });
}

/** Posodobi status kamere / NVR / stikal glede na TCP povezavo (strežnik mora dostopati do IP-jev). */
export async function runClientReachability(clientId: string) {
  requireDb();
  const client = await prisma!.client.findUnique({
    where: { id: clientId },
    include: { cameras: true, recorders: true, switches: true },
  });
  if (!client) throw new Error("NOT_FOUND");

  const tasks: Promise<unknown>[] = [];

  for (const cam of client.cameras) {
    if (!cam.ip?.trim()) continue;
    const port = cam.checkPort && cam.checkPort > 0 ? cam.checkPort : 554;
    tasks.push(
      (async () => {
        const ok = await probeTcpPort(cam.ip, port);
        await prisma!.clientCamera.update({
          where: { id: cam.id },
          data: { status: ok ? "online" : "offline" },
        });
      })(),
    );
  }

  for (const r of client.recorders) {
    if (!r.ip?.trim()) continue;
    tasks.push(
      (async () => {
        const ok = await probeTcpPort(r.ip, 80);
        await prisma!.clientRecorder.update({
          where: { id: r.id },
          data: { status: ok ? "online" : "offline" },
        });
      })(),
    );
  }

  for (const s of client.switches) {
    if (!s.ip?.trim()) continue;
    tasks.push(
      (async () => {
        const ok = await probeTcpPort(s.ip, 80);
        await prisma!.clientSwitch.update({
          where: { id: s.id },
          data: { status: ok ? "online" : "offline" },
        });
      })(),
    );
  }

  await Promise.all(tasks);
}
