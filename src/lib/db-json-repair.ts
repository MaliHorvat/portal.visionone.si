import { prisma, isDbConfigured } from "@/lib/db";

/** Ali je napaka posledica pokvarjenega JSON stolpca v MySQL/Prisma? */
export function isPrismaJsonParseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Unexpected end of JSON input|JSON.parse|not valid JSON|invalid JSON/i.test(msg);
}

/**
 * Popravi pogoste pokvarjene JSON vrednosti (prazen niz, NULL, neveljaven JSON).
 * Varno za večkratni klic.
 */
export async function repairClientJsonColumns(): Promise<void> {
  if (!isDbConfigured() || !prisma) return;

  await prisma.$executeRawUnsafe(`
    UPDATE Client SET tags = JSON_ARRAY()
    WHERE tags IS NULL
       OR CAST(tags AS CHAR) = ''
       OR JSON_VALID(CAST(tags AS CHAR)) = 0
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE Client SET topologyData = NULL
    WHERE topologyData IS NOT NULL
      AND (CAST(topologyData AS CHAR) = '' OR JSON_VALID(CAST(topologyData AS CHAR)) = 0)
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE Client SET rackData = NULL
    WHERE rackData IS NOT NULL
      AND (CAST(rackData AS CHAR) = '' OR JSON_VALID(CAST(rackData AS CHAR)) = 0)
  `);
}

export async function repairAppUserJsonColumns(): Promise<void> {
  if (!isDbConfigured() || !prisma) return;
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE AppUserAccount SET navPermissions = NULL
      WHERE navPermissions IS NOT NULL
        AND (CAST(navPermissions AS CHAR) = '' OR JSON_VALID(CAST(navPermissions AS CHAR)) = 0)
    `);
  } catch {
    /* tabela / stolpec morda še ne obstaja */
  }
}

export async function repairAllJsonColumns(): Promise<void> {
  await repairClientJsonColumns();
  await repairAppUserJsonColumns();
}
