import { auth } from "@clerk/nextjs/server";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";
import { signPortalSessionToken } from "@/lib/portal-session-sign";
import { normalizeNavPermissions } from "@/lib/nav-permissions";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { logger } from "@/lib/logger";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/portal-login?error=clerk", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  let granted:
    | {
        username: string;
        role: "admin" | "operator" | "viewer";
        mustChangePassword: boolean;
        navPermissions: ReturnType<typeof normalizeNavPermissions>;
      }
    | null = null;

  if (username && password && isDbConfigured() && prisma) {
    const row = await prisma.appUserAccount.findUnique({ where: { username } });
    if (row?.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
      await appendAuditLog(username, "portal_login_locked", row.lockedUntil.toISOString());
      return NextResponse.redirect(new URL("/portal-login?error=locked", request.url), { status: 303 });
    }
    if (row && (await bcrypt.compare(password, row.passwordHash))) {
      // V preteklosti so lahko obstajali zapisi z `isAdmin = true` in `role = viewer`.
      // Za prijavo vedno obravnavamo tak račun kot admin.
      const effectiveRole: "admin" | "operator" | "viewer" = row.isAdmin ? "admin" : row.role;
      granted = {
        username: row.username,
        role: effectiveRole,
        mustChangePassword: row.mustChangePassword,
        navPermissions: normalizeNavPermissions(row.navPermissions, effectiveRole),
      };
      await prisma.appUserAccount.update({
        where: { id: row.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          // Samodejna sanacija neskladja role/isAdmin v bazi.
          ...(row.isAdmin && row.role !== "admin" ? { role: "admin" } : {}),
          ...(!row.isAdmin && row.role === "admin" ? { role: "viewer" } : {}),
        },
      });
      await appendAuditLog(row.username, "portal_login_success", effectiveRole);
    } else if (row) {
      const failed = row.failedLoginCount + 1;
      const lockUntil = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
      await prisma.appUserAccount.update({
        where: { id: row.id },
        data: {
          failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
          lockedUntil: lockUntil,
        },
      });
      await appendAuditLog(username, "portal_login_fail", lockUntil ? "locked" : `attempt_${failed}`);
      if (lockUntil) {
        return NextResponse.redirect(new URL("/portal-login?error=locked", request.url), { status: 303 });
      }
    } else {
      await appendAuditLog(username || "unknown", "portal_login_fail", "no_user");
      logger.warn("portal_login_fail", { username, reason: "no_user" });
    }
  }

  if (!granted) {
    return NextResponse.redirect(new URL("/portal-login?error=1", request.url), { status: 303 });
  }

  let token: string;
  try {
    token = signPortalSessionToken(granted, getPortalSessionSecret());
  } catch (err) {
    logger.error("portal_login_session_sign_failed", { error: String(err) });
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
