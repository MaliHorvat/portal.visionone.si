import { prisma, isDbConfigured } from "@/lib/db";
import { RTSP_DEFINITION_SEEDS } from "@/lib/rtsp-templates";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

/** Vstavi ali posodobi vse standardne RTSP predloge (ne briše drugih proizvajalcev). */
export async function seedCameraDefinitions(): Promise<{ upserted: number }> {
  requireDb();
  let upserted = 0;
  for (const row of RTSP_DEFINITION_SEEDS) {
    await prisma!.cameraDefinition.upsert({
      where: { manufacturer: row.manufacturer },
      create: {
        manufacturer: row.manufacturer,
        mainStream: row.mainStream,
        subStream: row.subStream,
      },
      update: {
        mainStream: row.mainStream,
        subStream: row.subStream,
      },
    });
    upserted += 1;
  }
  return { upserted };
}

export async function listCameraDefinitions() {
  requireDb();
  return prisma!.cameraDefinition.findMany({ orderBy: { manufacturer: "asc" } });
}
