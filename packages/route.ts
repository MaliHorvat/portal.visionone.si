import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { createPackage, listPackages } from "@/lib/repositories/packages";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const packages = await listPackages();
    return NextResponse.json({ packages });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju paketov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const price = Number(body?.price ?? 0);
    const description = String(body?.description ?? "");
    if (!name) return jsonError("Polje 'name' je obvezno.");
    if (!Number.isFinite(price) || price < 0) return jsonError("Cena je neveljavna.");
    const created = await createPackage({ name, price, description });
    return NextResponse.json({ package: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju paketa.", 500);
  }
}
