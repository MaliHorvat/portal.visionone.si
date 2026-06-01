import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const form = await request.formData();
    const raw = form.get("file");
    if (!raw || !(raw instanceof Blob)) return jsonError("Manjka datoteka.", 400);
    if (raw.size === 0) return jsonError("Prazna datoteka.", 400);
    if (raw.size > MAX_BYTES) return jsonError("Datoteka je prevelika (max 12 MB).", 400);
    const mime = raw.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) return jsonError("Dovoljene so samo slike (JPEG, PNG, WebP, GIF, SVG).", 400);

    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : mime === "image/svg+xml"
              ? "svg"
              : "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "marketing");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await raw.arrayBuffer());
    await writeFile(path.join(dir, name), buf);
    const url = `/marketing/${name}`;
    return NextResponse.json({ url, ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Nalaganje slike ni uspelo.", 500);
  }
}
