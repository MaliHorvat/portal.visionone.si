import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/repositories/audit-log";

const NOTIFY = process.env.PORTAL_ACCESS_NOTIFY_EMAIL ?? "info@visionone.si";

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

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PORTAL_RESEND_FROM?.trim();
  if (resendKey && from) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [NOTIFY],
          subject: `VisionOne portal — nova zahteva za dostop (${email || userId})`,
          text: `Nova zahteva za portalni dostop.\n\nIme: ${name}\nE-pošta: ${email || "—"}\nClerk ID: ${userId}\n\nRočno ustvarite zapis v AppUserAccount in obvestite uporabnika.`,
        }),
      });
    } catch (e) {
      console.error("[portal-access-request] Resend:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
