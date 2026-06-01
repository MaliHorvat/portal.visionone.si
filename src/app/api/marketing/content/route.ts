import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { getMarketingSiteContent } from "@/lib/repositories/marketing-site";

/** Javno branje vsebine za visionone.si (brez prijave). */
export async function GET() {
  try {
    const content = await getMarketingSiteContent();
    return NextResponse.json(
      { content },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju vsebine.", 500);
  }
}
