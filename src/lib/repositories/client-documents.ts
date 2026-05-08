import { prisma } from "@/lib/db";

export type ClientDocumentMeta = {
  id: string;
  folder: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export async function listDocumentFolders(clientId: string): Promise<string[]> {
  if (!prisma) return [];
  const rows = await prisma.clientDocument.groupBy({
    by: ["folder"],
    where: { clientId },
    orderBy: { folder: "asc" },
  });
  return rows.map((r) => r.folder);
}

export async function listDocuments(clientId: string, folder?: string): Promise<ClientDocumentMeta[]> {
  if (!prisma) return [];
  const rows = await prisma.clientDocument.findMany({
    where: { clientId, ...(folder !== undefined ? { folder } : {}) },
    select: {
      id: true,
      folder: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    folder: r.folder,
    originalName: r.originalName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getDocumentBlob(clientId: string, docId: string) {
  if (!prisma) return null;
  return prisma.clientDocument.findFirst({
    where: { id: docId, clientId },
    select: { data: true, originalName: true, mimeType: true, sizeBytes: true },
  });
}

export async function createDocument(
  clientId: string,
  input: { folder: string; originalName: string; mimeType: string; sizeBytes: number; data: Buffer },
) {
  if (!prisma) throw new Error("DB");
  return prisma.clientDocument.create({
    data: {
      clientId,
      folder: input.folder.trim(),
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      data: new Uint8Array(input.data),
    },
    select: {
      id: true,
      folder: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });
}

export async function deleteDocument(clientId: string, docId: string) {
  if (!prisma) return false;
  const res = await prisma.clientDocument.deleteMany({ where: { id: docId, clientId } });
  return res.count > 0;
}
