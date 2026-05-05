import { prisma, isDbConfigured } from "@/lib/db";
import { getMockClient, getMockClients } from "@/lib/mock-data";
import type {
  CameraDevice,
  ClientDetail,
  ClientHealth,
  ClientSummary,
  DeviceStatus,
  DiskEntry,
  DiskHealth,
  NvrDevice,
  SubscriptionPackageDto,
  SwitchDevice,
} from "@/lib/types";

type DbClient = NonNullable<
  Awaited<ReturnType<NonNullable<typeof prisma>["client"]["findFirst"]>>
> & {
  package?: { id: string; name: string; price: number; description: string } | null;
  cameras?: Array<{ id: string; name: string; ip: string; model: string; status: string }>;
  recorders?: Array<{ id: string; name: string; ip: string; model: string; status: string; diskTb: number }>;
  switches?: Array<{ id: string; name: string; ip: string; model: string; status: string; ports: number }>;
  disks?: Array<{ id: string; label: string; sizeTb: number; installedAt: string; health: string }>;
};

function mapPackage(p: DbClient["package"]): SubscriptionPackageDto | null {
  if (!p) return null;
  return { id: p.id, name: p.name, price: p.price, description: p.description };
}

function mapStatus(s: string): DeviceStatus {
  if (s === "online" || s === "offline" || s === "alarm") return s;
  return "online";
}

function mapDiskHealth(h: string): DiskHealth {
  if (h === "ok" || h === "warn" || h === "fail") return h;
  return "ok";
}

function mapHealth(h: string): ClientHealth {
  return h === "alarm" ? "alarm" : "ok";
}

function mapClientSummary(c: DbClient): ClientSummary {
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    contact: c.contact,
    email: c.email,
    package: mapPackage(c.package),
    health: mapHealth(c.health),
  };
}

function mapClientDetail(c: DbClient): ClientDetail {
  const cameras: CameraDevice[] =
    c.cameras?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
    })) ?? [];
  const nvrs: NvrDevice[] =
    c.recorders?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
      diskTb: d.diskTb,
    })) ?? [];
  const switches: SwitchDevice[] =
    c.switches?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
      ports: d.ports,
    })) ?? [];
  const disks: DiskEntry[] =
    c.disks?.map((d) => ({
      id: d.id,
      label: d.label,
      sizeTb: d.sizeTb,
      installedAt: d.installedAt,
      health: mapDiskHealth(d.health),
    })) ?? [];

  return { ...mapClientSummary(c), cameras, nvrs, switches, disks };
}

export async function listClients(): Promise<ClientSummary[]> {
  if (!isDbConfigured() || !prisma) {
    return getMockClients().map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      contact: c.contact,
      email: c.email,
      package: c.package,
      health: c.health,
    }));
  }
  const rows = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { package: true },
  });
  return rows.map(mapClientSummary);
}

export async function getClient(id: string): Promise<ClientDetail | null> {
  if (!isDbConfigured() || !prisma) {
    return getMockClient(id) ?? null;
  }
  const row = await prisma.client.findUnique({
    where: { id },
    include: {
      package: true,
      cameras: true,
      recorders: true,
      switches: true,
      disks: true,
    },
  });
  if (!row) return null;
  return mapClientDetail(row);
}

export interface UpsertClientInput {
  name: string;
  address?: string;
  contact?: string;
  email?: string;
  health?: ClientHealth;
  packageId?: string | null;
}

export async function createClient(data: UpsertClientInput): Promise<ClientDetail> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const row = await prisma.client.create({
    data: {
      name: data.name,
      address: data.address ?? "",
      contact: data.contact ?? "",
      email: data.email ?? "",
      health: data.health ?? "ok",
      packageId: data.packageId ?? null,
    },
    include: {
      package: true,
      cameras: true,
      recorders: true,
      switches: true,
      disks: true,
    },
  });
  return mapClientDetail(row);
}

export async function updateClient(
  id: string,
  data: Partial<UpsertClientInput>,
): Promise<ClientDetail> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const row = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      contact: data.contact,
      email: data.email,
      health: data.health,
      packageId: data.packageId === undefined ? undefined : data.packageId,
    },
    include: {
      package: true,
      cameras: true,
      recorders: true,
      switches: true,
      disks: true,
    },
  });
  return mapClientDetail(row);
}

export async function deleteClient(id: string): Promise<void> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  await prisma.client.delete({ where: { id } });
}
