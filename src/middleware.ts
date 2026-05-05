import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPortalSessionValid, PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const isLoggedIn = isPortalSessionValid(sessionCookie);
  const isPortalLoginRoute = pathname === "/portal-login";
  const isPortalRoute = pathname === "/portal" || pathname.startsWith("/portal/");

  if (isPortalRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/portal-login", request.url));
  }

  if (isPortalLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
