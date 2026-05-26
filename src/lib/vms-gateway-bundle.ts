import fs from "fs/promises";
import path from "path";
import { zipSync, strToU8 } from "fflate";
import { createVmsGatewayClaim } from "@/lib/repositories/vms-admin";
import { isVmsDbConfigured, vmsPrisma } from "@/lib/vms-db";

const AGENT_ROOT = path.join(process.cwd(), "agent-rpi-vms");

export type VmsGatewayBundleMeta = {
  siteId: string;
  siteName: string;
  customerId: string;
  customerName: string;
  gatewayName: string;
  externalId: string;
  claimCode: string;
  claimExpiresAt: string;
  vmsBaseUrl: string;
  generatedAt: string;
};

function slugPart(name: string) {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return s || "objekt";
}

function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

async function readTemplate(rel: string) {
  return fs.readFile(path.join(AGENT_ROOT, rel), "utf8");
}

function buildEnvFile(vars: {
  vmsBaseUrl: string;
  claimCode: string;
  gatewayName: string;
}) {
  const lines = [
    `VMS_API_BASE=${vars.vmsBaseUrl}`,
    `VMS_CLAIM_CODE=${vars.claimCode}`,
    `GATEWAY_NAME=${vars.gatewayName}`,
    "AUTO_DISCOVER=1",
    "SCAN_INTERVAL_SECONDS=300",
    "CHECK_INTERVAL_SECONDS=30",
    "# NVR_IP and CAMERA_TARGETS sta opcijska ročna override polja",
    "NVR_IP=",
    "CAMERA_TARGETS=",
    "# Cloudflare Tunnel token (Zero Trust) — opcijsko, za live view",
    "CLOUDFLARE_TUNNEL_TOKEN=",
  ];
  return `${lines.join("\n")}\n`;
}

export async function createVmsGatewayBundleForSite(siteId: string, vmsBaseUrl: string) {
  if (!isVmsDbConfigured() || !vmsPrisma) throw new Error("VMS_DATABASE_URL ni nastavljena.");
  const db = vmsPrisma;
  const site = await db.vmsSite.findUnique({
    where: { id: siteId },
    include: {
      customer: true,
      cameras: { where: { enabled: true }, orderBy: [{ channel: "asc" }, { name: "asc" }] },
    },
  });
  if (!site) throw new Error("VMS objekt ne obstaja.");

  const gatewayName = `${site.customer.name} — ${site.name}`;
  const claim = await createVmsGatewayClaim(siteId, {
    name: gatewayName,
    daysValid: 30,
  });

  const generatedAt = new Date().toISOString();
  const vmsUrl = vmsBaseUrl.replace(/\/$/, "");

  const vars: Record<string, string> = {
    CUSTOMER_NAME: site.customer.name,
    SITE_NAME: site.name,
    GATEWAY_NAME: gatewayName,
    CLAIM_CODE: claim.code,
    CLAIM_EXPIRES: claim.expiresAt.toLocaleString("sl-SI"),
    VMS_API_BASE: vmsUrl,
    GENERATED_AT: generatedAt,
  };

  const files: Record<string, Uint8Array> = {};
  files[".env"] = strToU8(
    buildEnvFile({
      vmsBaseUrl: vmsUrl,
      claimCode: claim.code,
      gatewayName,
    }),
  );

  const binaryEntries = ["visionone_vms_gateway.py", "sync-go2rtc-config.py"] as const;
  for (const rel of binaryEntries) {
    files[rel] = strToU8(await readTemplate(rel));
  }

  const textEntries = [
    ["README-SLO.txt", "README-SLO.txt"],
    ["NAVODILA-Pi-SLO.txt", "NAVODILA-Pi-SLO.txt"],
    ["NAVODILA-CLOUDFLARE-SLO.txt", "NAVODILA-CLOUDFLARE-SLO.txt"],
    ["install.sh", "install.sh"],
    ["install-go2rtc.sh", "install-go2rtc.sh"],
    ["install-cloudflared.sh", "install-cloudflared.sh"],
  ] as const;

  for (const [zipPath, diskPath] of textEntries) {
    const raw = await readTemplate(diskPath);
    const text = diskPath.endsWith(".sh") ? applyTemplate(raw, vars).replace(/\r\n/g, "\n") : applyTemplate(raw, vars);
    files[zipPath] = strToU8(text);
  }

  const zip = zipSync(files, { level: 6 });
  const meta: VmsGatewayBundleMeta = {
    siteId: site.id,
    siteName: site.name,
    customerId: site.customerId,
    customerName: site.customer.name,
    gatewayName,
    externalId: claim.externalId,
    claimCode: claim.code,
    claimExpiresAt: claim.expiresAt.toISOString(),
    vmsBaseUrl: vmsUrl,
    generatedAt,
  };
  const filename = `visionone-vms-gateway-${slugPart(site.customer.name)}-${slugPart(site.name)}.zip`;
  return { zip, meta, filename };
}
