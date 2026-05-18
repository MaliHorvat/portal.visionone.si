import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export type OfferLineInput = {
  section: "material" | "service";
  sortOrder: number;
  code: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  lineVatPct: number;
};

export async function listClientOffers(clientId: string) {
  requireDb();
  return prisma!.clientOffer.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function listAllOffersForSession(ownerUsername: string | null, isAdmin: boolean) {
  requireDb();
  const where = isAdmin || !ownerUsername ? {} : { client: { ownerUsername } };
  return prisma!.clientOffer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, slug: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
    take: 500,
  });
}

export async function createEmptyOffer(clientId: string, opts?: { title?: string }) {
  requireDb();
  const client = await prisma!.client.findUnique({
    where: { id: clientId },
    select: { address: true, name: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  const defaultTitle = opts?.title?.trim() || `Ponudba — ${client?.name ?? "stranka"} (${today})`;
  return prisma!.clientOffer.create({
    data: {
      clientId,
      title: defaultTitle,
      offerDate: today,
      clientAddress: client?.address ?? "",
    },
    include: { lines: true },
  });
}

export async function duplicateOffer(offerId: string) {
  requireDb();
  const src = await getOffer(offerId);
  if (!src) throw new Error("Ponudba ne obstaja.");
  const baseTitle = (src.title || "Ponudba").trim();
  return prisma!.clientOffer.create({
    data: {
      clientId: src.clientId,
      title: `${baseTitle} (kopija)`,
      offerDate: src.offerDate || new Date().toISOString().slice(0, 10),
      clientAddress: src.clientAddress,
      notes: src.notes,
      totalDiscountPct: src.totalDiscountPct,
      vatEnabled: src.vatEnabled,
      vatPct: src.vatPct,
      lines: {
        create: src.lines.map((l) => ({
          section: l.section,
          sortOrder: l.sortOrder,
          code: l.code,
          description: l.description,
          unit: l.unit,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          lineVatPct: l.lineVatPct,
        })),
      },
    },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getOffer(offerId: string) {
  requireDb();
  return prisma!.clientOffer.findUnique({
    where: { id: offerId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function updateOfferFull(
  offerId: string,
  patch: {
    title?: string;
    offerDate?: string;
    clientAddress?: string;
    notes?: string;
    totalDiscountPct?: number;
    vatEnabled?: boolean;
    vatPct?: number;
    lines?: OfferLineInput[];
  },
) {
  requireDb();
  const lines = patch.lines ?? [];

  await prisma!.$transaction(async (tx) => {
    const meta: Record<string, string | number | boolean> = {};
    if (patch.title !== undefined) meta.title = patch.title;
    if (patch.offerDate !== undefined) meta.offerDate = patch.offerDate;
    if (patch.clientAddress !== undefined) meta.clientAddress = patch.clientAddress;
    if (patch.notes !== undefined) meta.notes = patch.notes;
    if (patch.totalDiscountPct !== undefined) meta.totalDiscountPct = patch.totalDiscountPct;
    if (patch.vatEnabled !== undefined) meta.vatEnabled = patch.vatEnabled;
    if (patch.vatPct !== undefined) meta.vatPct = patch.vatPct;

    await tx.clientOffer.update({
      where: { id: offerId },
      data: meta,
    });
    await tx.clientOfferLine.deleteMany({ where: { offerId } });
    if (lines.length > 0) {
      await tx.clientOfferLine.createMany({
        data: lines.map((l) => ({
          offerId,
          section: l.section,
          sortOrder: l.sortOrder,
          code: l.code,
          description: l.description,
          unit: l.unit,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          lineVatPct: l.lineVatPct,
        })),
      });
    }
  });

  return getOffer(offerId);
}

export async function deleteOffer(offerId: string) {
  requireDb();
  await prisma!.clientOffer.delete({ where: { id: offerId } });
}
