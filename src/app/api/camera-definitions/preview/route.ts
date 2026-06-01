import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";
import { buildRtspUrl, matchManufacturer } from "@/lib/rtsp-templates";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const definitions = await prisma.cameraDefinition.findMany({ orderBy: { manufacturer: "asc" } });
    const clients = await prisma.client.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        cameras: {
          select: {
            id: true,
            name: true,
            tag: true,
            ip: true,
            model: true,
            rtspUser: true,
            rtspPass: true,
            streamUrl: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    const rows = clients.map((c) => ({
      clientId: c.id,
      clientName: c.name,
      slug: c.slug,
      cameras: c.cameras.map((cam) => {
        const def = matchManufacturer(cam.model, definitions);
        const user = cam.rtspUser;
        const pass = cam.rtspPass;
        const ip = cam.ip;
        return {
          id: cam.id,
          name: cam.name,
          tag: cam.tag,
          ip,
          model: cam.model,
          rtspUser: user,
          hasPass: Boolean(pass),
          manufacturer: def?.manufacturer ?? null,
          mainUrl:
            def && ip
              ? buildRtspUrl({ ip, user, pass, path: def.mainStream })
              : cam.streamUrl || "",
          subUrl: def && ip ? buildRtspUrl({ ip, user, pass, path: def.subStream }) : "",
        };
      }),
    }));

    return NextResponse.json({ clients: rows, definitions });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri predogledu.", 500);
  }
}
