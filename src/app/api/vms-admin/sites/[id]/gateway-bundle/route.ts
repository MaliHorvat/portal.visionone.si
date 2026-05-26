import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsGatewayBundleForSite } from "@/lib/vms-gateway-bundle";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;

  try {
    const { id: siteId } = await ctx.params;
    const vmsBase =
      process.env.NEXT_PUBLIC_VMS_BASE_URL?.trim() ||
      "https://vms.visionone.si";

    const { zip, meta, filename } = await createVmsGatewayBundleForSite(siteId, vmsBase);

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-VisionOne-Gateway-Id": meta.externalId,
        "X-VisionOne-Claim-Code": meta.claimCode,
      },
    });
  } catch (err) {
    console.error("[vms-admin] gateway bundle failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri generiranju gateway paketa.", 500);
  }
}
