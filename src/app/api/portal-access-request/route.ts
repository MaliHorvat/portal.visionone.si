import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { upsertPortalAccessRequest } from "@/lib/repositories/portal-access-requests";
import { logger } from "@/lib/logger";
import { sendTelegramNotification } from "@/lib/telegram-notify";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Ni Clerk seje." }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email ||
    userId;

  const details = JSON.stringify({
    clerkUserId: userId,
    email,
    name,
    at: new Date().toISOString(),
  });

  await appendAuditLog(email || userId, "portal_access_request", details);
  const result = await upsertPortalAccessRequest({
    clerkUserId: userId,
    clerkEmail: email,
    clerkName: name,
  });

  logger.info("portal_access_request", {
    clerkUserId: userId,
    email,
    notify: "portal_only",
    requestId: result?.request?.id ?? null,
    isNew: result?.isNew ?? false,
  });

  if (result?.isNew) {
    void sendTelegramNotification(
      `🔐 Zahteva za dostop do portala\nIme: ${name}\nE-pošta: ${email || "-"}\nClerk ID: ${userId}`,
      "portal_access_request",
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: result?.request?.id ?? null,
    isNew: result?.isNew ?? false,
  });
}
