import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { isPortalSessionCookieValid } from "@/lib/portal-session-verify";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  const { userId } = await auth();

  const sessionCookie = req.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const portalOk = await isPortalSessionCookieValid(sessionCookie);

  const isPortalLogin = pathname === "/portal-login" || pathname.startsWith("/portal-login/");
  const isPortalApp = pathname === "/portal" || pathname.startsWith("/portal/");
  const isMojApp = pathname === "/moj" || pathname.startsWith("/moj/");

  const host = req.headers.get("host") ?? "";
  const isMojHost = host.startsWith("moj.");

  if (isMojHost && pathname === "/") {
    return NextResponse.redirect(new URL("/moj", req.url));
  }

  if (isMojApp || (isMojHost && !pathname.startsWith("/api"))) {
    if (!userId) {
      return NextResponse.redirect(new URL("/portal-login?app=moj", req.url));
    }
    if (!portalOk) {
      return NextResponse.redirect(new URL("/portal-login?app=moj", req.url));
    }
    return NextResponse.next();
  }

  if (isPortalApp) {
    if (!userId) {
      return NextResponse.redirect(new URL("/portal-login", req.url));
    }
    if (!portalOk) {
      return NextResponse.redirect(new URL("/portal-login", req.url));
    }
    return NextResponse.next();
  }

  if (isPortalLogin) {
    if (portalOk) {
      const dest = isMojHost || req.nextUrl.searchParams.get("app") === "moj" ? "/moj" : "/portal";
      return NextResponse.redirect(new URL(dest, req.url));
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
