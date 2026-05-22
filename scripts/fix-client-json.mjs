import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run(sql, label) {
  const n = await prisma.$executeRawUnsafe(sql);
  console.log(label, Number(n));
}

try {
  await run(
    `UPDATE Client SET tags = JSON_ARRAY()
     WHERE tags IS NULL OR CAST(tags AS CHAR) = '' OR JSON_VALID(CAST(tags AS CHAR)) = 0`,
    "Client.tags",
  );
  await run(
    `UPDATE Client SET topologyData = NULL
     WHERE topologyData IS NOT NULL
       AND (CAST(topologyData AS CHAR) = '' OR JSON_VALID(CAST(topologyData AS CHAR)) = 0)`,
    "Client.topologyData",
  );
  await run(
    `UPDATE Client SET rackData = NULL
     WHERE rackData IS NOT NULL
       AND (CAST(rackData AS CHAR) = '' OR JSON_VALID(CAST(rackData AS CHAR)) = 0)`,
    "Client.rackData",
  );
  try {
    await run(
      `UPDATE AppUserAccount SET navPermissions = NULL
       WHERE navPermissions IS NOT NULL
         AND (CAST(navPermissions AS CHAR) = '' OR JSON_VALID(CAST(navPermissions AS CHAR)) = 0)`,
      "AppUserAccount.navPermissions",
    );
  } catch {
    console.log("AppUserAccount.navPermissions — preskočeno");
  }
  console.log("JSON sanacija končana.");
} catch (e) {
  console.error("Napaka:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
