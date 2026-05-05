import { NextResponse } from "next/server";
import {
  DEFAULT_PORTAL_PASSWORD,
  DEFAULT_PORTAL_USERNAME,
  getPortalSessionValue,
  PORTAL_SESSION_COOKIE,
} from "@/lib/portal-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (username !== DEFAULT_PORTAL_USERNAME || password !== DEFAULT_PORTAL_PASSWORD) {
    return NextResponse.redirect(new URL("/portal-login?error=1", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/portal", request.url), { status: 303 });
  response.cookies.set(PORTAL_SESSION_COOKIE, getPortalSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
