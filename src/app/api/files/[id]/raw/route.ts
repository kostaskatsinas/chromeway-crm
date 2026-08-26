import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { handler, ApiError } from "@/lib/api";
import { UPLOAD_DIR, canAccessEntityFiles } from "@/lib/files";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** GET /api/files/{id}/raw?variant=thumb|main — serves stored bytes with auth */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(async (_rq, c) => {
    const file = await prisma.file.findFirst({ where: { id, deletedAt: null } });
    if (!file) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    if (!canAccessEntityFiles(c.user.role, file.entityType, "view")) throw new ApiError(403, "FORBIDDEN");

    const variant = new URL(req.url).searchParams.get("variant");
    let diskPath = file.storagePath;
    if (variant === "thumb" && file.thumbPath) {
      diskPath = path.join(UPLOAD_DIR, file.thumbPath);
    } else if (variant === "main" && IMAGE_RE.test(file.mimeType)) {
      const mainPath = path.join(UPLOAD_DIR, `${file.id}_main.webp`);
      try {
        await stat(mainPath);
        diskPath = mainPath;
      } catch {
        /* fall back to original */
      }
    }

    try {
      await stat(diskPath);
    } catch {
      return NextResponse.json({ ok: false, error: "GONE" }, { status: 410 });
    }

    // Only raster images may render inline; anything else (HTML, SVG, PDFs…) is
    // forced to download so uploaded content can never execute on our origin.
    const inlineSafe = /^image\//.test(file.mimeType) && file.mimeType !== "image/svg+xml";
    const disposition = variant || !inlineSafe ? "attachment" : "inline";

    const stream = createReadStream(diskPath) as any;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": variant === "thumb" ? "image/webp" : file.mimeType || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.originalName)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  })(req);
}

const IMAGE_RE = /^image\//;
