import type { PortalAccessRequestStatus, PortalUserRole } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db";

export async function upsertPortalAccessRequest(input: {
  clerkUserId: string;
  clerkEmail: string;
  clerkName: string;
}) {
  if (!isDbConfigured() || !prisma) return null;
  const existing = await prisma.portalAccessRequest.findUnique({
    where: { clerkUserId: input.clerkUserId },
  });
  if (!existing) {
    return prisma.portalAccessRequest.create({
      data: {
        clerkUserId: input.clerkUserId,
        clerkEmail: input.clerkEmail,
        clerkName: input.clerkName,
      },
    });
  }
  const status: PortalAccessRequestStatus =
    existing.status === "rejected" ? "new" : existing.status;
  return prisma.portalAccessRequest.update({
    where: { id: existing.id },
    data: {
      clerkEmail: input.clerkEmail,
      clerkName: input.clerkName,
      status,
      ...(status === "new" ? { requestedAt: new Date() } : {}),
    },
  });
}

export async function listPortalAccessRequests() {
  if (!isDbConfigured() || !prisma) return [];
  return prisma.portalAccessRequest.findMany({
    orderBy: { requestedAt: "desc" },
    include: {
      portalUser: {
        select: { id: true, username: true, role: true },
      },
    },
  });
}

export async function setPortalAccessRequestStatus(
  id: string,
  status: PortalAccessRequestStatus,
  processedBy: string,
  note?: string,
) {
  if (!isDbConfigured() || !prisma) return null;
  return prisma.portalAccessRequest.update({
    where: { id },
    data: {
      status,
      processedBy,
      processedAt: new Date(),
      note: note ?? "",
    },
  });
}

export async function createPortalUserFromRequest(input: {
  requestId: string;
  username: string;
  email: string;
  passwordHash: string;
  role: PortalUserRole;
  processedBy: string;
}) {
  if (!isDbConfigured() || !prisma) return null;
  return prisma.$transaction(async (tx) => {
    const user = await tx.appUserAccount.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        isAdmin: input.role === "admin",
        mustChangePassword: true,
      },
    });
    const request = await tx.portalAccessRequest.update({
      where: { id: input.requestId },
      data: {
        status: "approved",
        processedBy: input.processedBy,
        processedAt: new Date(),
        portalUserId: user.id,
      },
    });
    return { user, request };
  });
}
