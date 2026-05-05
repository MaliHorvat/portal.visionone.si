import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { sendPortalAccessNotifyEmail } from "@/lib/send-portal-access-notify";

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

  const subject = `VisionOne portal — nova zahteva za dostop (${email || userId})`;
  const text = `Nova zahteva za portalni dostop.\n\nIme: ${name}\nE-pošta: ${email || "—"}\nClerk ID: ${userId}\n\nRočno ustvarite zapis v AppUserAccount in obvestite uporabnika.`;

  const { sent: emailSent } = await sendPortalAccessNotifyEmail({
    subject,
    text,
    replyTo: email || undefined,
  });

  return NextResponse.json({ ok: true, emailSent });
}
