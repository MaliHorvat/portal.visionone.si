import { prisma, isDbConfigured } from "@/lib/db";
import { mockPackages } from "@/lib/mock-data";
import type { SubscriptionPackageDto } from "@/lib/types";

export async function listPackages(): Promise<SubscriptionPackageDto[]> {
  if (!isDbConfigured() || !prisma) return mockPackages;
  const rows = await prisma.subscriptionPackage.findMany({ orderBy: { name: "asc" } });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
  }));
}

export async function getPackage(id: string): Promise<SubscriptionPackageDto | null> {
  if (!isDbConfigured() || !prisma) {
    return mockPackages.find((p) => p.id === id) ?? null;
  }
  const row = await prisma.subscriptionPackage.findUnique({ where: { id } });
  if (!row) return null;
  return { id: row.id, name: row.name, price: row.price, description: row.description };
}

export async function createPackage(data: {
  name: string;
  price: number;
  description?: string;
}): Promise<SubscriptionPackageDto> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena (manjka DATABASE_URL).");
  }
  const row = await prisma.subscriptionPackage.create({
    data: {
      name: data.name,
      price: data.price,
      description: data.description ?? "",
    },
  });
  return { id: row.id, name: row.name, price: row.price, description: row.description };
}

export async function updatePackage(
  id: string,
  data: { name?: string; price?: number; description?: string },
): Promise<SubscriptionPackageDto> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const row = await prisma.subscriptionPackage.update({
    where: { id },
    data: {
      name: data.name,
      price: data.price,
      description: data.description,
    },
  });
  return { id: row.id, name: row.name, price: row.price, description: row.description };
}

export async function deletePackage(id: string): Promise<void> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  await prisma.subscriptionPackage.delete({ where: { id } });
}
