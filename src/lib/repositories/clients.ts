import type { Prisma } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendClientProfileChanges } from "@/lib/repositories/client-profile";
import { getMockClient, getMockClients } from "@/lib/mock-data";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import { slugifyName } from "@/lib/slug";
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
  slug?: string | null;
  package?: { id: string; name: string; price: number; description: string } | null;
  topologyData?: Prisma.JsonValue | null;
  rackData?: Prisma.JsonValue | null;
  cameras?: Array<{
    id: string;
    name: string;
    ip: string;
    model: string;
    status: string;
    checkPort: number | null;
    rtspUser: string;
    rtspPass: string;
    streamUrl: string;
    comment: string;
    tag: string;
  }>;
  recorders?: Array<{
    id: string;
    name: string;
    ip: string;
    model: string;
    status: string;
    diskTb: number;
    comment: string;
  }>;
  switches?: Array<{
    id: string;
    name: string;
    ip: string;
    model: string;
    status: string;
    ports: number;
    comment: string;
  }>;
  disks?: Array<{
    id: string;
    label: string;
    ip: string;
    model: string;
    sizeTb: number;
    installedAt: string;
    health: string;
    serial: string;
    comment: string;
  }>;
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

function parseClientTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").map((t) => t.trim()).filter(Boolean);
}

function mapClientSummary(c: DbClient): ClientSummary {
  return {
    id: c.id,
    slug: c.slug ?? null,
    name: c.name,
    address: c.address,
    contact: c.contact,
    phone: c.phone ?? "",
    email: c.email,
    package: mapPackage(c.package),
    health: mapHealth(c.health),
    tags: parseClientTags((c as { tags?: unknown }).tags),
  };
}

async function allocateUniqueClientSlug(name: string, excludeClientId?: string): Promise<string> {
  if (!prisma) throw new Error("DB ni nastavljena.");
  const base = slugifyName(name);
  for (let i = 0; i < 500; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const clash = await prisma.client.findFirst({
      where: {
        slug: candidate,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
    });
    if (!clash) return candidate;
  }
  throw new Error("Ni mogoče dodeliti edinstvenega slug.");
}

function mapClientDetail(c: DbClient): ClientDetail {
  const cameras: CameraDevice[] =
    c.cameras?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
      checkPort: d.checkPort,
      rtspUser: d.rtspUser,
      rtspPass: d.rtspPass,
      streamUrl: d.streamUrl,
      comment: d.comment,
      tag: d.tag,
    })) ?? [];
  const nvrs: NvrDevice[] =
    c.recorders?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
      diskTb: d.diskTb,
      comment: d.comment,
    })) ?? [];
  const switches: SwitchDevice[] =
    c.switches?.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      model: d.model,
      status: mapStatus(d.status),
      ports: d.ports,
      comment: d.comment,
    })) ?? [];
  const disks: DiskEntry[] =
    c.disks?.map((d) => ({
      id: d.id,
      label: d.label,
      ip: d.ip ?? "",
      model: d.model ?? "",
      sizeTb: d.sizeTb,
      installedAt: d.installedAt,
      health: mapDiskHealth(d.health),
      serial: d.serial,
      comment: d.comment,
    })) ?? [];

  return {
    ...mapClientSummary(c),
    cameras,
    nvrs,
    switches,
    disks,
    topologyData: c.topologyData ?? null,
    rackData: c.rackData ?? null,
  };
}

export async function listClients(): Promise<ClientSummary[]> {
  if (!isDbConfigured() || !prisma) {
    return getMockClients().map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      address: c.address,
      contact: c.contact,
      phone: c.phone,
      email: c.email,
      package: c.package,
      health: c.health,
      tags: c.tags ?? [],
    }));
  }
  let rows: Awaited<ReturnType<NonNullable<typeof prisma>["client"]["findMany"]>>;
  try {
    rows = await prisma.client.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { package: true },
    });
  } catch {
    rows = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { package: true },
    });
  }
  return rows.map(mapClientSummary);
}

/** Brez veljavnega uporabniškega imena ne vračamo nobenih strank (namesto skupnega pogleda). */
const NO_OWNER_SCOPE = { ownerUsername: "__portal_no_owner__" } as const;

function scopeWhere(session?: Pick<PortalSessionPayload, "role" | "username">) {
  const u = session?.username?.trim();
  if (!u) return NO_OWNER_SCOPE;
  return { ownerUsername: u };
}

/** Preveri lastništvo stranke (id ali slug) za trenutnega portala uporabnika. */
export async function assertClientOwnedBySession(
  slugOrId: string,
  session: Pick<PortalSessionPayload, "username">,
): Promise<boolean> {
  const owner = session.username?.trim();
  if (!owner) return false;
  if (!isDbConfigured() || !prisma) return false;
  const row = await prisma.client.findFirst({
    where: {
      ownerUsername: owner,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    select: { id: true },
  });
  return !!row;
}

export async function listClientsForSession(
  session?: Pick<PortalSessionPayload, "role" | "username">,
): Promise<ClientSummary[]> {
  if (!isDbConfigured() || !prisma) return listClients();
  let rows: Awaited<ReturnType<NonNullable<typeof prisma>["client"]["findMany"]>>;
  try {
    rows = await prisma.client.findMany({
      where: scopeWhere(session),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { package: true },
    });
  } catch {
    rows = await prisma.client.findMany({
      where: scopeWhere(session),
      orderBy: { name: "asc" },
      include: { package: true },
    });
  }
  return rows.map(mapClientSummary);
}

export async function getClient(slugOrId: string): Promise<ClientDetail | null> {
  if (!isDbConfigured() || !prisma) {
    return getMockClient(slugOrId) ?? null;
  }
  const include = {
    package: true,
    cameras: true,
    recorders: true,
    switches: true,
    disks: true,
  } as const;
  let row = await prisma.client.findUnique({
    where: { id: slugOrId },
    include,
  });
  if (!row) {
    row = await prisma.client.findUnique({
      where: { slug: slugOrId },
      include,
    });
  }
  if (!row) return null;
  // Ne izvajamo samodejnega UPDATE tukaj, da profil ne čaka dodatne DB mutacije.
  // Če stranka še nima sluga, stran ostane dostopna tudi preko id.
  return mapClientDetail(row);
}

export async function getClientForSession(
  slugOrId: string,
  session?: Pick<PortalSessionPayload, "role" | "username">,
): Promise<ClientDetail | null> {
  if (!isDbConfigured() || !prisma) return getClient(slugOrId);
  const include = {
    package: true,
    cameras: true,
    recorders: true,
    switches: true,
    disks: true,
  } as const;
  const whereScope = scopeWhere(session);
  let row = await prisma.client.findFirst({
    where: { id: slugOrId, ...whereScope },
    include,
  });
  if (!row) {
    row = await prisma.client.findFirst({
      where: { slug: slugOrId, ...whereScope },
      include,
    });
  }
  if (!row) return null;
  return mapClientDetail(row);
}

export interface UpsertClientInput {
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  health?: ClientHealth;
  packageId?: string | null;
  /** Oznake stranke */
  tags?: string[];
  topologyData?: Prisma.InputJsonValue;
  rackData?: Prisma.InputJsonValue;
}

export async function createClient(data: UpsertClientInput): Promise<ClientDetail> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const max = await prisma.client.aggregate({ _max: { sortOrder: true } }).catch(() => ({ _max: { sortOrder: 0 } }));
  const slug = await allocateUniqueClientSlug(data.name);
  const row = await prisma.client.create({
    data: {
      name: data.name,
      slug,
      address: data.address ?? "",
      contact: data.contact ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      health: data.health ?? "ok",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      packageId: data.packageId ?? null,
      tags: (data.tags ?? []) as unknown as Prisma.InputJsonValue,
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

export async function createClientForSession(
  data: UpsertClientInput,
  session?: Pick<PortalSessionPayload, "role" | "username">,
): Promise<ClientDetail> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const max = await prisma.client.aggregate({
    where: scopeWhere(session),
    _max: { sortOrder: true },
  }).catch(() => ({ _max: { sortOrder: 0 } }));
  const slug = await allocateUniqueClientSlug(data.name);
  const row = await prisma.client.create({
    data: {
      name: data.name,
      slug,
      address: data.address ?? "",
      contact: data.contact ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      health: data.health ?? "ok",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      packageId: data.packageId ?? null,
      ownerUsername: session?.username?.trim() || "admin",
      tags: (data.tags ?? []) as unknown as Prisma.InputJsonValue,
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
  actor?: string,
): Promise<ClientDetail> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const prev = await prisma.client.findUnique({
    where: { id },
    select: {
      name: true,
      address: true,
      contact: true,
      phone: true,
      email: true,
      health: true,
      packageId: true,
      tags: true,
    },
  });
  let newSlug: string | undefined;
  if (data.name !== undefined) {
    newSlug = await allocateUniqueClientSlug(data.name, id);
  }
  const row = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      ...(newSlug !== undefined ? { slug: newSlug } : {}),
      address: data.address,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      health: data.health,
      packageId: data.packageId === undefined ? undefined : data.packageId,
      topologyData: data.topologyData === undefined ? undefined : data.topologyData,
      rackData: data.rackData === undefined ? undefined : data.rackData,
      tags: data.tags === undefined ? undefined : (data.tags as unknown as Prisma.InputJsonValue),
    },
    include: {
      package: true,
      cameras: true,
      recorders: true,
      switches: true,
      disks: true,
    },
  });
  if (actor?.trim() && prev) {
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const push = (field: string, oldVal: unknown, newVal: unknown) => {
      const o = String(oldVal ?? "");
      const n = String(newVal ?? "");
      if (o !== n) changes.push({ field, oldValue: o.slice(0, 4000), newValue: n.slice(0, 4000) });
    };
    if (data.name !== undefined) push("name", prev.name, data.name);
    if (data.address !== undefined) push("address", prev.address, data.address);
    if (data.contact !== undefined) push("contact", prev.contact, data.contact);
    if (data.phone !== undefined) push("phone", prev.phone, data.phone);
    if (data.email !== undefined) push("email", prev.email, data.email);
    if (data.health !== undefined) push("health", prev.health, data.health);
    if (data.packageId !== undefined) push("packageId", prev.packageId ?? "", data.packageId ?? "");
    if (data.tags !== undefined) {
      push("tags", JSON.stringify(parseClientTags(prev.tags)), JSON.stringify(data.tags ?? []));
    }
    if (changes.length) await appendClientProfileChanges(id, actor.trim(), changes);
  }
  return mapClientDetail(row);
}

export async function deleteClient(id: string): Promise<void> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  await prisma.client.delete({ where: { id } });
}

export async function reorderClientsForSession(
  orderedIds: string[],
  session?: Pick<PortalSessionPayload, "role" | "username">,
): Promise<void> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const db = prisma;
  const rows = await db.client.findMany({
    where: scopeWhere(session),
    select: { id: true },
  });
  const allowed = new Set(rows.map((r) => r.id));
  const filtered = orderedIds.filter((id) => allowed.has(id));
  if (filtered.length === 0) return;
  try {
    await db.$transaction(
      filtered.map((id, idx) =>
        db.client.update({
          where: { id },
          data: { sortOrder: idx + 1 },
        }),
      ),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unknown column|sortOrder|doesn't exist|does not exist/i.test(msg)) {
      throw new Error("Manjka stolpec sortOrder — zaženite: npx prisma db push");
    }
    throw e;
  }
}
