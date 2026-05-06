import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";

export async function GET() {
  const dbConfigured = isDbConfigured() && !!prisma;
  let dbOk = false;
  if (dbConfigured && prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }

  const mailConfigured = Boolean(
    (process.env.PORTAL_SMTP_HOST && process.env.PORTAL_SMTP_USER && process.env.PORTAL_SMTP_PASS) ||
      (process.env.RESEND_API_KEY && process.env.PORTAL_RESEND_FROM),
  );

  const status = dbConfigured ? (dbOk ? "ok" : "degraded") : "degraded";
  return NextResponse.json(
    {
      status,
      time: new Date().toISOString(),
      checks: {
        dbConfigured,
        dbOk,
        mailConfigured,
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
