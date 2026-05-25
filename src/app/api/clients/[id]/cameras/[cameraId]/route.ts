import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { deleteCamera, updateCamera } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string; cameraId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, cameraId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const cam = await prisma.clientCamera.findFirst({
      where: { id: cameraId, clientId },
    });
    if (!cam) return jsonError("Kamera ne obstaja.", 404);
    const body = await request.json();
    const row = await updateCamera(cameraId, {
      tag: body?.tag !== undefined ? String(body.tag) : undefined,
      name: body?.name !== undefined ? String(body.name) : undefined,
      ip: body?.ip !== undefined ? String(body.ip) : undefined,
      rtspUser: body?.rtspUser !== undefined ? String(body.rtspUser) : undefined,
      rtspPass: body?.rtspPass !== undefined ? String(body.rtspPass) : undefined,
      model: body?.model !== undefined ? String(body.model) : undefined,
      comment: body?.comment !== undefined ? String(body.comment) : undefined,
      status: body?.status !== undefined ? String(body.status) : undefined,
      checkPort:
        body?.checkPort === null || body?.checkPort === ""
          ? null
          : body?.checkPort !== undefined
            ? Number(body.checkPort)
            : undefined,
      streamUrl: body?.streamUrl !== undefined ? String(body.streamUrl) : undefined,
      frigateCameraKey: body?.frigateCameraKey !== undefined ? String(body.frigateCameraKey) : undefined,
      kerberosCameraKey: body?.kerberosCameraKey !== undefined ? String(body.kerberosCameraKey) : undefined,
    });
    return NextResponse.json({ camera: row });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri urejanju kamere.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, cameraId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const cam = await prisma.clientCamera.findFirst({
      where: { id: cameraId, clientId },
    });
    if (!cam) return jsonError("Kamera ne obstaja.", 404);
    await deleteCamera(cameraId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju.", 500);
  }
}
