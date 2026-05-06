import nodemailer from "nodemailer";

const DEFAULT_NOTIFY = "info@visionone.si";

function notifyRecipient(): string {
  const v = process.env.PORTAL_ACCESS_NOTIFY_EMAIL?.trim();
  return v && v.includes("@") ? v : DEFAULT_NOTIFY;
}

/**
 * Pošlje obvestilo skrbniku (privzeto info@visionone.si).
 * Prednost: SMTP (PORTAL_SMTP_*) — primerno za lasten strežnik pošte @visionone.si;
 * sicer Resend (RESEND_API_KEY + PORTAL_RESEND_FROM).
 */
export async function sendPortalEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ sent: boolean; transport: "smtp" | "resend" | "none" }> {
  const to = input.to;
  if (!to || !to.includes("@")) return { sent: false, transport: "none" };

  const host = process.env.PORTAL_SMTP_HOST?.trim();
  const user = process.env.PORTAL_SMTP_USER?.trim();
  const pass = process.env.PORTAL_SMTP_PASS?.trim();
  const from = process.env.PORTAL_SMTP_FROM?.trim() || user;

  if (host && user && pass && from) {
    try {
      const port = Number.parseInt(process.env.PORTAL_SMTP_PORT ?? "587", 10) || 587;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to,
        replyTo: input.replyTo || undefined,
        subject: input.subject,
        text: input.text,
      });
      return { sent: true, transport: "smtp" };
    } catch (e) {
      console.error("[portal-mail] SMTP:", e);
      return { sent: false, transport: "smtp" };
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.PORTAL_RESEND_FROM?.trim();
  if (resendKey && resendFrom) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          reply_to: input.replyTo ? [input.replyTo] : undefined,
          subject: input.subject,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[portal-mail] Resend HTTP", res.status, body);
        return { sent: false, transport: "resend" };
      }
      return { sent: true, transport: "resend" };
    } catch (e) {
      console.error("[portal-mail] Resend:", e);
      return { sent: false, transport: "resend" };
    }
  }

  console.warn(
    "[portal-mail] Pošta ni nastavljena. Dodajte PORTAL_SMTP_* ali RESEND_API_KEY + PORTAL_RESEND_FROM.",
  );
  return { sent: false, transport: "none" };
}

export async function sendPortalAccessNotifyEmail(input: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ sent: boolean; transport: "smtp" | "resend" | "none" }> {
  const to = notifyRecipient();
  return sendPortalEmail({ ...input, to });
}
