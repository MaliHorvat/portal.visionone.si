import { NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/portal-login", request.url), { status: 303 });
  response.cookies.delete(PORTAL_SESSION_COOKIE);
  return response;
}
