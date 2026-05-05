import { auth } from "@clerk/nextjs/server";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";
import { signPortalSessionToken } from "@/lib/portal-session-sign";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/portal-login?error=clerk", request.url), { status: 303 });
  }

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

  const stayLoggedIn = String(formData.get("stay_logged_in") ?? "") === "1";

  const response = NextResponse.redirect(new URL("/portal", request.url), { status: 303 });
  response.cookies.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    /** Brez maxAge = sejni piškotek — ob zaprtju brskalnika seja poteče. Če je »Ostani prijavljen«, 30 dni. */
    ...(stayLoggedIn ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  return response;
}
