import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;

    const body = await request.json();
    const rtspUser = String(body?.rtspUser ?? "").trim();
    const rtspPass = String(body?.rtspPass ?? "");
    const onlyEmpty = Boolean(body?.onlyEmpty);

    if (!rtspUser && !rtspPass) {
      return jsonError("Vnesite uporabniško ime ali geslo.");
    }

    const cameras = await prisma.clientCamera.findMany({
      where: { clientId },
      select: { id: true, rtspUser: true, rtspPass: true },
    });

    const toUpdate = cameras.filter((c) => {
      if (!onlyEmpty) return true;
      return !c.rtspUser.trim() || !c.rtspPass.trim();
    });

    if (toUpdate.length === 0) {
      return NextResponse.json({ updated: 0, message: "Ni kamer za posodobitev." });
    }

    await prisma.$transaction(
      toUpdate.map((c) =>
        prisma!.clientCamera.update({
          where: { id: c.id },
          data: {
            ...(rtspUser ? { rtspUser } : {}),
            ...(rtspPass ? { rtspPass } : {}),
          },
        }),
      ),
    );

    return NextResponse.json({ updated: toUpdate.length });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri množičnem posodabljanju.", 500);
  }
}
