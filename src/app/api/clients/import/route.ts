import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { createClientForSession } from "@/lib/repositories/clients";
import { appendAuditLog } from "@/lib/repositories/audit-log";

/** CSV z glavo: Ime;Naslov;Kontakt;Telefon;E-pošta;Oznake (vejica);PaketId */
export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const body = await request.text();
    if (!body.trim()) return jsonError("Prazen uvoz.");
    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return jsonError("Pričakovana vsaj glava in ena vrstica.");
    const created: string[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(";").map((c) => c.trim());
      const [name, address, contact, phone, email, tagsRaw, packageId] = cols;
      if (!name) {
        errors.push(`Vrstica ${i + 1}: manjka ime.`);
        continue;
      }
      const tags = (tagsRaw ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      try {
        await createClientForSession(
          {
            name,
            address: address ?? "",
            contact: contact ?? "",
            phone: phone ?? "",
            email: email ?? "",
            tags,
            packageId: packageId || null,
            health: "ok",
          },
          session,
        );
        created.push(name);
      } catch (err) {
        errors.push(`Vrstica ${i + 1} (${name}): ${err instanceof Error ? err.message : "napaka"}`);
      }
    }
    await appendAuditLog(session.username, "clients_bulk_import", `${created.length} ustvarjenih`);
    return NextResponse.json({ created: created.length, names: created, errors });
  } catch (e) {
    console.error(e);
    return jsonError("Uvoz ni uspel.", 500);
  }
}
