import { PrismaClient as VmsPrismaClient } from "@/generated/vms-prisma";

const globalForVmsPrisma = globalThis as unknown as { vmsPrisma?: VmsPrismaClient };

function createVmsPrismaClient(): VmsPrismaClient | undefined {
  if (!process.env.VMS_DATABASE_URL) return undefined;
  try {
    return new VmsPrismaClient({ log: ["error", "warn"] });
  } catch (err) {
    console.warn("[vms-db] Prisma client init failed:", err);
    return undefined;
  }
}

export const vmsPrisma: VmsPrismaClient | undefined =
  globalForVmsPrisma.vmsPrisma ?? createVmsPrismaClient();

if (process.env.NODE_ENV !== "production" && vmsPrisma) {
  globalForVmsPrisma.vmsPrisma = vmsPrisma;
}

export const isVmsDbConfigured = (): boolean => Boolean(vmsPrisma);
