import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { mergeMarketingContent } from "@/lib/marketing-cms/merge";
import type { MarketingSiteContent } from "@/lib/marketing-cms/types";
import { getMarketingSiteContent, saveMarketingSiteContent } from "@/lib/repositories/marketing-site";

export async function GET() {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const content = await getMarketingSiteContent();
    return NextResponse.json({ content });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju.", 500);
  }
}

export async function PUT(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const body = (await request.json().catch(() => ({}))) as { content?: MarketingSiteContent };
    if (!body.content) return jsonError("Manjka vsebina (content).", 400);
    const merged = mergeMarketingContent(body.content);
    const saved = await saveMarketingSiteContent(merged, session?.username ?? "admin");
    return NextResponse.json({ content: saved, ok: true });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    if (/MarketingSiteContent|doesn't exist|does not exist/i.test(msg)) {
      return jsonError("Manjkajoča tabela — zaženite manual_marketing_site.sql v bazi.", 503);
    }
    return jsonError("Shranjevanje ni uspelo.", 500);
  }
}
