import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { zipSync, strToU8 } from "fflate";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";

const AGENT_RPI_ROOT = path.join(process.cwd(), "agent-rpi");
const AGENT_FRIGATE_ROOT = path.join(process.cwd(), "agent-frigate");

export type RpiBundleMeta = {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  siteLabel: string;
  claimCode: string;
  claimExpiresAt: string;
  portalUrl: string;
  osTarget: string;
  generatedAt: string;
};

export type FrigateBundleMeta = RpiBundleMeta & {
  osTarget: "Docker host (Linux x64/aarch64)";
};

function makeClaimCode() {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `VO-${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

function slugPart(name: string) {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return s || "stranka";
}

function makeAgentId(clientName: string, clientId: string) {
  const tail = clientId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || crypto.randomBytes(3).toString("hex");
  return `rpi-${slugPart(clientName)}-${tail}`;
}

function makeFrigateAgentId(clientName: string, clientId: string) {
  const tail = clientId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || crypto.randomBytes(3).toString("hex");
  return `frigate-${slugPart(clientName)}-${tail}`;
}

function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

async function readTemplate(rel: string) {
  return fs.readFile(path.join(AGENT_RPI_ROOT, rel), "utf8");
}

async function readFrigateTemplate(rel: string) {
  return fs.readFile(path.join(AGENT_FRIGATE_ROOT, rel), "utf8");
}

export async function createRpiAgentBundleForClient(
  clientId: string,
  createdBy: string,
  portalBaseUrl: string,
): Promise<{ zip: Uint8Array; meta: RpiBundleMeta; filename: string }> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, address: true },
  });
  if (!client) throw new Error("Stranka ne obstaja.");

  const agentId = makeAgentId(client.name, client.id);
  const agentName = `RB — ${client.name}`;
  const siteLabel = client.address?.trim() || client.name;
  const claimCode = makeClaimCode();
  const ttlDays = 14;
  const claimExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const generatedAt = new Date().toISOString();
  const portalUrl = portalBaseUrl.replace(/\/$/, "");

  await prisma.telemetryAgent.upsert({
    where: { externalId: agentId },
    create: {
      externalId: agentId,
      name: agentName,
      siteLabel,
      clientId: client.id,
      lastConfigAt: new Date(),
      configVersion: 1,
    },
    update: {
      name: agentName,
      siteLabel,
      clientId: client.id,
      lastConfigAt: new Date(),
    },
  });

  await prisma.agentClaimCode.create({
    data: {
      code: claimCode,
      externalId: agentId,
      name: agentName,
      siteLabel,
      clientId: client.id,
      expiresAt: claimExpiresAt,
      createdBy,
    },
  });

  await appendAuditLog(createdBy, "rpi_bundle_create", `${agentId} → ${client.id}`);

  const vars: Record<string, string> = {
    CLIENT_NAME: client.name,
    AGENT_ID: agentId,
    AGENT_NAME: agentName,
    SITE_LABEL: siteLabel,
    CLAIM_CODE: claimCode,
    PORTAL_URL: portalUrl,
    CLAIM_EXPIRES: claimExpiresAt.toLocaleString("sl-SI"),
    GENERATED_AT: generatedAt,
  };

  const files: Record<string, Uint8Array> = {};
  const entries = [
    ["README-SLO.txt", "README-SLO.txt"],
    ["boot/visionone-claim.txt", "boot/visionone-claim.txt"],
    ["boot/firstrun.sh", "boot/firstrun.sh"],
    ["boot/visionone-agent-install.sh", "boot/visionone-agent-install.sh"],
    ["boot/opt/visionone-agent/install.sh", "opt/visionone-agent/install.sh"],
    ["boot/opt/visionone-agent/visionone_agent.py", "opt/visionone-agent/visionone_agent.py"],
    ["opt/visionone-agent/install.sh", "opt/visionone-agent/install.sh"],
    ["opt/visionone-agent/visionone_agent.py", "opt/visionone-agent/visionone_agent.py"],
  ] as const;

  for (const [zipPath, diskPath] of entries) {
    const raw = await readTemplate(diskPath);
    const text = diskPath.endsWith(".sh")
      ? applyTemplate(raw, vars).replace(/\r\n/g, "\n")
      : applyTemplate(raw, vars);
    files[zipPath] = strToU8(text);
  }

  const zip = zipSync(files, { level: 6 });
  const meta: RpiBundleMeta = {
    clientId: client.id,
    clientName: client.name,
    agentId,
    agentName,
    siteLabel,
    claimCode,
    claimExpiresAt: claimExpiresAt.toISOString(),
    portalUrl,
    osTarget: "Raspberry Pi OS 64-bit (aarch64)",
    generatedAt,
  };
  const filename = `visionone-rpi-${slugPart(client.name)}.zip`;
  return { zip, meta, filename };
}

export async function createFrigateAgentBundleForClient(
  clientId: string,
  createdBy: string,
  portalBaseUrl: string,
): Promise<{ zip: Uint8Array; meta: FrigateBundleMeta; filename: string }> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, address: true },
  });
  if (!client) throw new Error("Stranka ne obstaja.");

  const agentId = makeFrigateAgentId(client.name, client.id);
  const agentName = `Frigate — ${client.name}`;
  const siteLabel = client.address?.trim() || client.name;
  const claimCode = makeClaimCode();
  const ttlDays = 14;
  const claimExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const generatedAt = new Date().toISOString();
  const portalUrl = portalBaseUrl.replace(/\/$/, "");

  await prisma.telemetryAgent.upsert({
    where: { externalId: agentId },
    create: {
      externalId: agentId,
      name: agentName,
      siteLabel,
      clientId: client.id,
      lastConfigAt: new Date(),
      configVersion: 1,
    },
    update: {
      name: agentName,
      siteLabel,
      clientId: client.id,
      lastConfigAt: new Date(),
      configVersion: { increment: 1 },
    },
  });

  await prisma.agentClaimCode.create({
    data: {
      code: claimCode,
      externalId: agentId,
      name: agentName,
      siteLabel,
      clientId: client.id,
      expiresAt: claimExpiresAt,
      createdBy,
    },
  });

  await appendAuditLog(createdBy, "frigate_bundle_create", `${agentId} → ${client.id}`);

  const vars: Record<string, string> = {
    CLIENT_NAME: client.name,
    AGENT_ID: agentId,
    AGENT_NAME: agentName,
    SITE_LABEL: siteLabel,
    CLAIM_CODE: claimCode,
    PORTAL_URL: portalUrl,
    CLAIM_EXPIRES: claimExpiresAt.toLocaleString("sl-SI"),
    GENERATED_AT: generatedAt,
  };

  const files: Record<string, Uint8Array> = {};
  const entries = [
    ["README-SLO.txt", "README-SLO.txt"],
    ["docker-compose.yml", "docker-compose.yml"],
    [".env.example", ".env.example"],
    [".env", ".env.example"],
    ["config/frigate.yml", "config/frigate.yml"],
    ["visionone-frigate-agent/Dockerfile", "visionone-frigate-agent/Dockerfile"],
    ["visionone-frigate-agent/visionone_frigate_agent.py", "visionone-frigate-agent/visionone_frigate_agent.py"],
  ] as const;

  for (const [zipPath, diskPath] of entries) {
    const raw = await readFrigateTemplate(diskPath);
    const text = applyTemplate(raw, vars).replace(/\r\n/g, "\n");
    files[zipPath] = strToU8(text);
  }

  const zip = zipSync(files, { level: 6 });
  const meta: FrigateBundleMeta = {
    clientId: client.id,
    clientName: client.name,
    agentId,
    agentName,
    siteLabel,
    claimCode,
    claimExpiresAt: claimExpiresAt.toISOString(),
    portalUrl,
    osTarget: "Docker host (Linux x64/aarch64)",
    generatedAt,
  };
  const filename = `visionone-frigate-${slugPart(client.name)}.zip`;
  return { zip, meta, filename };
}
