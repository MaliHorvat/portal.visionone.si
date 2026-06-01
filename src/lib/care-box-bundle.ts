import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { zipSync, strToU8 } from "fflate";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";

const AGENT_RPI_ROOT = path.join(process.cwd(), "agent-rpi");

export type CareBoxBundleMeta = {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  siteLabel: string;
  claimCode: string;
  claimExpiresAt: string;
  portalUrl: string;
  generatedAt: string;
};

function makeClaimCode() {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `CARE-${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
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

function makeCareAgentId(clientName: string, clientId: string) {
  const tail = clientId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || crypto.randomBytes(3).toString("hex");
  return `care-${slugPart(clientName)}-${tail}`;
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

/** Pripravi SD paket za VisionOne Care Box (monitoring + oddaljena podpora). */
export async function createCareBoxBundleForClient(
  clientId: string,
  createdBy: string,
  portalBaseUrl: string,
): Promise<{ zip: Uint8Array; meta: CareBoxBundleMeta; filename: string }> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, address: true },
  });
  if (!client) throw new Error("Stranka ne obstaja.");

  const agentId = makeCareAgentId(client.name, client.id);
  const agentName = `Care Box — ${client.name}`;
  const siteLabel = client.address?.trim() || client.name;
  const claimCode = makeClaimCode();
  const ttlDays = 30;
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
      agentKind: "care_box",
      lastConfigAt: new Date(),
      configVersion: 1,
    },
    update: {
      name: agentName,
      siteLabel,
      clientId: client.id,
      agentKind: "care_box",
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

  await prisma.client.update({
    where: { id: client.id },
    data: { careBoxEnabled: true },
  });

  await appendAuditLog(createdBy, "care_box_bundle_create", `${agentId} → ${client.id}`);

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
    ["NAVODILA-CARE-BOX-SLO.txt", "NAVODILA-CARE-BOX-SLO.txt"],
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
  const meta: CareBoxBundleMeta = {
    clientId: client.id,
    clientName: client.name,
    agentId,
    agentName,
    siteLabel,
    claimCode,
    claimExpiresAt: claimExpiresAt.toISOString(),
    portalUrl,
    generatedAt,
  };
  const filename = `visionone-care-box-${slugPart(client.name)}.zip`;
  return { zip, meta, filename };
}
