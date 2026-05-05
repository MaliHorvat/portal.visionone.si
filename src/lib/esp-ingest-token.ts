import { NextResponse } from "next/server";

export function parseBearerToken(headerValue: string | null): string {
  if (!headerValue) return "";
  const [type, token] = headerValue.split(" ");
  if (type?.toLowerCase() !== "bearer") return "";
  return token?.trim() ?? "";
}

/** Returns NextResponse 401 if invalid, otherwise null. */
export function requireEspIngestAuth(request: Request): NextResponse | null {
  const expected = process.env.ESP_INGEST_TOKEN ?? "";
  if (!expected) {
    return NextResponse.json({ error: "ESP_INGEST_TOKEN ni nastavljen." }, { status: 500 });
  }
  const provided = parseBearerToken(request.headers.get("authorization"));
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Neavtorizirano." }, { status: 401 });
  }
  return null;
}
