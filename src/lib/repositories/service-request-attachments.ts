import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function listAttachments(serviceRequestId: string) {
  requireDb();
  return prisma!.serviceRequestAttachment.findMany({
    where: { serviceRequestId },
    orderBy: { createdAt: "desc" },
    select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
  });
}

export async function addAttachment(
  serviceRequestId: string,
  originalName: string,
  mimeType: string,
  data: Buffer,
) {
  requireDb();
  if (data.length > MAX_BYTES) throw new Error("Datoteka je prevelika (max 5 MB).");
  return prisma!.serviceRequestAttachment.create({
    data: {
      serviceRequestId,
      originalName,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: data.length,
      data,
    },
    select: { id: true, originalName: true, sizeBytes: true, createdAt: true },
  });
}

export async function getAttachmentBytes(id: string, serviceRequestId: string) {
  requireDb();
  return prisma!.serviceRequestAttachment.findFirst({
    where: { id, serviceRequestId },
    select: { data: true, originalName: true, mimeType: true },
  });
}

export async function deleteAttachment(id: string, serviceRequestId: string) {
  requireDb();
  await prisma!.serviceRequestAttachment.deleteMany({ where: { id, serviceRequestId } });
}
