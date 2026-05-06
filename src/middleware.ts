import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { isPortalSessionCookieValid, verifyPortalSessionToken } from "@/lib/portal-session-verify";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  const { userId } = await auth();

  const sessionCookie = req.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const portalOk = await isPortalSessionCookieValid(sessionCookie);
  const payload =
    sessionCookie && sessionCookie.startsWith("v2.") ? await verifyPortalSessionToken(sessionCookie) : null;

  const isPortalLogin = pathname === "/portal-login" || pathname.startsWith("/portal-login/");
  const isPortalApp = pathname === "/portal" || pathname.startsWith("/portal/");

  if (isPortalApp) {
    if (!userId) {
      return NextResponse.redirect(new URL("/portal-login", req.url));
    }
    if (!portalOk) {
      return NextResponse.redirect(new URL("/portal-login", req.url));
    }
    if (
      payload?.mustChangePassword &&
      pathname !== "/portal/racun" &&
      pathname !== "/api/portal-password" &&
      pathname !== "/api/portal-logout"
    ) {
      return NextResponse.redirect(new URL("/portal/racun?force_password=1", req.url));
    }
    return NextResponse.next();
  }

  if (isPortalLogin) {
    if (portalOk) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
