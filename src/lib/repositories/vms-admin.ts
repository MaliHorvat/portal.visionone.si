import crypto from "crypto";
import { isVmsDbConfigured, vmsPrisma } from "@/lib/vms-db";
import type { Prisma, VmsUserRole } from "@/generated/vms-prisma";

const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

export type VmsAdminPlanDto = {
  id: string;
  code: string;
  name: string;
  cameraLimit: number;
  userLimit: number;
  liveEnabled: boolean;
  playbackEnabled: boolean;
  alertsEnabled: boolean;
  customerCount: number;
};

export type VmsAdminCustomerDto = {
  id: string;
  slug: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  planId: string;
  planName: string;
  cameraLimit: number;
  cameraCount: number;
  siteCount: number;
  userCount: number;
  gatewayCount: number;
  gatewaysOnline: number;
  sites: Array<{
    id: string;
    name: string;
    address: string;
    nvrName: string;
    nvrIp: string;
    nvrModel: string;
    streamBaseUrl: string;
    cameras: Array<{ id: string; siteId: string; name: string; channel: number; ip: string; rtspUrl: string; model: string; status: string; enabled: boolean }>;
    gateways: Array<{ id: string; name: string; externalId: string; status: string; lastSeenAt: Date | null; version: string }>;
    claims: Array<{ id: string; code: string; externalId: string; name: string; expiresAt: Date; consumedAt: Date | null }>;
  }>;
  users: Array<{ id: string; email: string; name: string; role: VmsUserRole; isActive: boolean; lastLoginAt: Date | null }>;
};

export type VmsAdminOverviewDto = {
  dbConfigured: boolean;
  vmsBaseUrl: string;
  plans: VmsAdminPlanDto[];
  customers: VmsAdminCustomerDto[];
};

type VmsCustomerWithAdminData = Prisma.VmsCustomerGetPayload<{
  include: {
    plan: true;
    sites: {
      include: {
        cameras: true;
        gateways: true;
        claims: true;
      };
    };
    users: true;
  };
}>;

function assertVmsDb() {
  if (!isVmsDbConfigured() || !vmsPrisma) {
    throw new Error("VMS_DATABASE_URL ni nastavljena.");
  }
  return vmsPrisma;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `vms-${crypto.randomBytes(3).toString("hex")}`;
}

function hashVmsPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("base64url");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

function randomClaimCode() {
  const body = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `VMS-${body.slice(0, 5)}-${body.slice(5)}`;
}

function mapCustomer(customer: VmsCustomerWithAdminData): VmsAdminCustomerDto {
  const cameraCount = customer.sites.reduce((sum, site) => sum + site.cameras.length, 0);
  const gateways = customer.sites.flatMap((site) => site.gateways);
  return {
    id: customer.id,
    slug: customer.slug,
    name: customer.name,
    contact: customer.contact,
    email: customer.email,
    phone: customer.phone,
    planId: customer.planId,
    planName: customer.plan.name,
    cameraLimit: customer.plan.cameraLimit,
    cameraCount,
    siteCount: customer.sites.length,
    userCount: customer.users.length,
    gatewayCount: gateways.length,
    gatewaysOnline: gateways.filter((gateway) => gateway.status === "online").length,
    sites: customer.sites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      nvrName: site.nvrName,
      nvrIp: site.nvrIp,
      nvrModel: site.nvrModel,
      streamBaseUrl: site.streamBaseUrl,
      cameras: site.cameras.map((camera) => ({
        id: camera.id,
        siteId: camera.siteId,
        name: camera.name,
        channel: camera.channel,
        ip: camera.ip,
        rtspUrl: camera.rtspUrl,
        model: camera.model,
        status: camera.status,
        enabled: camera.enabled,
      })),
      gateways: site.gateways.map((gateway) => ({
        id: gateway.id,
        name: gateway.name,
        externalId: gateway.externalId,
        status: gateway.status,
        lastSeenAt: gateway.lastSeenAt,
        version: gateway.version,
      })),
      claims: site.claims.map((claim) => ({
        id: claim.id,
        code: claim.code,
        externalId: claim.externalId,
        name: claim.name,
        expiresAt: claim.expiresAt,
        consumedAt: claim.consumedAt,
      })),
    })),
    users: customer.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    })),
  };
}

export async function listVmsAdminOverview(): Promise<VmsAdminOverviewDto> {
  if (!isVmsDbConfigured() || !vmsPrisma) {
    return { dbConfigured: false, vmsBaseUrl: process.env.NEXT_PUBLIC_VMS_BASE_URL ?? "", plans: [], customers: [] };
  }
  const [plans, customers] = await Promise.all([
    vmsPrisma.vmsLicensePlan.findMany({
      orderBy: { cameraLimit: "asc" },
      include: { _count: { select: { customers: true } } },
    }),
    vmsPrisma.vmsCustomer.findMany({
      include: {
        plan: true,
        sites: {
          include: {
            cameras: { orderBy: [{ channel: "asc" }, { name: "asc" }] },
            gateways: { orderBy: [{ lastSeenAt: "desc" }, { name: "asc" }] },
            claims: { orderBy: { createdAt: "desc" }, take: 5 },
          },
          orderBy: { name: "asc" },
        },
        users: { orderBy: { email: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    dbConfigured: true,
    vmsBaseUrl: process.env.NEXT_PUBLIC_VMS_BASE_URL ?? "https://vms.visionone.si",
    plans: plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      cameraLimit: plan.cameraLimit,
      userLimit: plan.userLimit,
      liveEnabled: plan.liveEnabled,
      playbackEnabled: plan.playbackEnabled,
      alertsEnabled: plan.alertsEnabled,
      customerCount: plan._count.customers,
    })),
    customers: customers.map(mapCustomer),
  };
}

export async function ensureDefaultVmsPlans() {
  const db = assertVmsDb();
  const defaults = [
    { code: "vms-4", name: "VMS 4", cameraLimit: 4, userLimit: 2 },
    { code: "vms-8", name: "VMS 8", cameraLimit: 8, userLimit: 3, playbackEnabled: true },
    { code: "vms-16", name: "VMS 16", cameraLimit: 16, userLimit: 5, playbackEnabled: true },
    { code: "vms-32", name: "VMS 32", cameraLimit: 32, userLimit: 10, playbackEnabled: true },
    { code: "custom", name: "Custom", cameraLimit: 999, userLimit: 25, playbackEnabled: true, alertsEnabled: true },
  ];
  for (const plan of defaults) {
    await db.vmsLicensePlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
}

export async function createVmsCustomer(data: {
  name: string;
  slug?: string;
  contact?: string;
  email?: string;
  phone?: string;
  planId: string;
}) {
  const db = assertVmsDb();
  const created = await db.vmsCustomer.create({
    data: {
      name: data.name,
      slug: data.slug?.trim() ? slugify(data.slug) : slugify(data.name),
      contact: data.contact ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      planId: data.planId,
    },
    include: {
      plan: true,
      sites: { include: { cameras: true, gateways: true, claims: true } },
      users: true,
    },
  });
  return mapCustomer(created);
}

export async function updateVmsCustomer(
  id: string,
  data: { name?: string; slug?: string; contact?: string; email?: string; phone?: string; planId?: string },
) {
  const db = assertVmsDb();
  const updated = await db.vmsCustomer.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug ? slugify(data.slug) : undefined,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      planId: data.planId,
    },
    include: {
      plan: true,
      sites: { include: { cameras: true, gateways: true, claims: true } },
      users: true,
    },
  });
  return mapCustomer(updated);
}

export async function deleteVmsCustomer(id: string) {
  const db = assertVmsDb();
  await db.vmsCustomer.delete({ where: { id } });
}

export async function createVmsSite(customerId: string, data: { name: string; address?: string; nvrName?: string; nvrIp?: string; nvrModel?: string }) {
  const db = assertVmsDb();
  return db.vmsSite.create({
    data: { customerId, name: data.name, address: data.address ?? "", nvrName: data.nvrName ?? "", nvrIp: data.nvrIp ?? "", nvrModel: data.nvrModel ?? "" },
  });
}

export async function updateVmsSite(id: string, data: { name?: string; address?: string; nvrName?: string; nvrIp?: string; nvrModel?: string; streamBaseUrl?: string }) {
  const db = assertVmsDb();
  return db.vmsSite.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      nvrName: data.nvrName,
      nvrIp: data.nvrIp,
      nvrModel: data.nvrModel,
      streamBaseUrl: data.streamBaseUrl,
    },
  });
}

export async function updateVmsSiteLiveConfig(
  id: string,
  data: { streamBaseUrl?: string; cameras?: Array<{ id: string; rtspUrl?: string }> },
) {
  const db = assertVmsDb();
  const site = await db.vmsSite.findUniqueOrThrow({
    where: { id },
    include: { cameras: true },
  });

  await db.$transaction(async (tx) => {
    if (data.streamBaseUrl !== undefined) {
      await tx.vmsSite.update({
        where: { id },
        data: { streamBaseUrl: data.streamBaseUrl },
      });
    }
    for (const row of data.cameras ?? []) {
      const camera = site.cameras.find((item) => item.id === row.id);
      if (!camera) throw new Error(`Kamera ${row.id} ne pripada temu objektu.`);
      await tx.vmsCamera.update({
        where: { id: row.id },
        data: { rtspUrl: row.rtspUrl ?? "" },
      });
    }
  });

  return db.vmsSite.findUniqueOrThrow({
    where: { id },
    include: { cameras: true },
  });
}

export async function deleteVmsSite(id: string) {
  const db = assertVmsDb();
  await db.vmsSite.delete({ where: { id } });
}

export async function createVmsCamera(siteId: string, data: { name: string; channel: number; ip?: string; model?: string }) {
  const db = assertVmsDb();
  const site = await db.vmsSite.findUniqueOrThrow({
    where: { id: siteId },
    include: { customer: { include: { plan: true, sites: { include: { _count: { select: { cameras: true } } } } } } },
  });
  const cameraCount = site.customer.sites.reduce((sum, row) => sum + row._count.cameras, 0);
  if (cameraCount >= site.customer.plan.cameraLimit) {
    throw new Error(`Licenca ${site.customer.plan.name} dovoljuje največ ${site.customer.plan.cameraLimit} kamer.`);
  }
  return db.vmsCamera.create({
    data: { siteId, name: data.name, channel: data.channel, ip: data.ip ?? "", model: data.model ?? "", status: "unknown" },
  });
}

export async function updateVmsCamera(id: string, data: { name?: string; channel?: number; ip?: string; rtspUrl?: string; model?: string; enabled?: boolean }) {
  const db = assertVmsDb();
  return db.vmsCamera.update({
    where: { id },
    data: {
      name: data.name,
      channel: data.channel,
      ip: data.ip,
      rtspUrl: data.rtspUrl,
      model: data.model,
      enabled: data.enabled,
    },
  });
}

export async function deleteVmsCamera(id: string) {
  const db = assertVmsDb();
  await db.vmsCamera.delete({ where: { id } });
}

export async function createVmsUser(customerId: string, data: { email: string; name?: string; password: string; role?: VmsUserRole }) {
  const db = assertVmsDb();
  return db.vmsUser.create({
    data: {
      customerId,
      email: data.email.trim().toLowerCase(),
      name: data.name ?? "",
      passwordHash: hashVmsPassword(data.password),
      role: data.role ?? "viewer",
    },
  });
}

export async function updateVmsUser(id: string, data: { email?: string; name?: string; role?: VmsUserRole; isActive?: boolean }) {
  const db = assertVmsDb();
  return db.vmsUser.update({
    where: { id },
    data: {
      email: data.email?.trim().toLowerCase(),
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    },
  });
}

export async function deleteVmsUser(id: string) {
  const db = assertVmsDb();
  await db.vmsUser.delete({ where: { id } });
}

export async function resetVmsUserPassword(userId: string, password: string) {
  const db = assertVmsDb();
  return db.vmsUser.update({ where: { id: userId }, data: { passwordHash: hashVmsPassword(password), isActive: true } });
}

export async function createVmsGatewayClaim(siteId: string, data: { name?: string; externalId?: string; daysValid?: number }) {
  const db = assertVmsDb();
  const site = await db.vmsSite.findUniqueOrThrow({ where: { id: siteId } });
  const externalId = data.externalId?.trim() || `vms-${site.id.slice(-6)}-${crypto.randomBytes(3).toString("hex")}`;
  return db.vmsGatewayClaim.create({
    data: {
      siteId,
      code: randomClaimCode(),
      externalId,
      name: data.name?.trim() || "VisionOne Pi Gateway",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (data.daysValid ?? 30)),
    },
  });
}

export async function deleteVmsGatewayClaim(id: string) {
  const db = assertVmsDb();
  await db.vmsGatewayClaim.delete({ where: { id } });
}
