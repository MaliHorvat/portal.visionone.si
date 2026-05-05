import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import {
  DEFAULT_PORTAL_PASSWORD,
  DEFAULT_PORTAL_USERNAME,
  PORTAL_SESSION_COOKIE,
} from "@/lib/portal-auth";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";
import { signPortalSessionToken } from "@/lib/portal-session-sign";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  let granted: { username: string; isAdmin: boolean } | null = null;

  if (username && password && isDbConfigured() && prisma) {
    const row = await prisma.appUserAccount.findUnique({ where: { username } });
    if (row && (await bcrypt.compare(password, row.passwordHash))) {
      granted = { username: row.username, isAdmin: row.isAdmin };
    }
  }

  if (!granted && username === DEFAULT_PORTAL_USERNAME && password === DEFAULT_PORTAL_PASSWORD) {
    granted = { username: DEFAULT_PORTAL_USERNAME, isAdmin: true };
  }

  if (!granted) {
    return NextResponse.redirect(new URL("/portal-login?error=1", request.url), { status: 303 });
  }

  let token: string;
  try {
    token = signPortalSessionToken(granted, getPortalSessionSecret());
  } catch (err) {
    console.error("[portal-login] session sign:", err);
    return NextResponse.redirect(new URL("/portal-login?error=config", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/portal", request.url), { status: 303 });
  response.cookies.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
