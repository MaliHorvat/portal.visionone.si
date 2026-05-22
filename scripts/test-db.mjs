import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const n = await prisma.client.count();
  console.log("OK — clients in DB:", n);
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
