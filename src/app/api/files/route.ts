import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { handler, ok, fail, ApiError } from "@/lib/api";
import { secureToken } from "@/lib/utils";
import { UPLOAD_DIR, canAccessEntityFiles } from "@/lib/files";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** POST multipart — stores file, generates compressed version & thumbnail for images. */
export async function POST(req: NextRequest) {
  return handler(async (rq, c) => {
    const form = await rq.formData();
    const file = form.get("file") as File | null;
    if (!file) return fail("NO_FILE");
    if (file.size > 25 * 1024 * 1024) return fail("FILE_TOO_LARGE");

    const entityType = (form.get("entityType") as string) || null;
    const entityId = (form.get("entityId") as string) || null;
    const category = (form.get("category") as string) || null;
    const caption = (form.get("caption") as string) || null;

    if (!entityType || !entityId) throw new ApiError(400, "MISSING_ENTITY");
    if (!canAccessEntityFiles(c.user.role, entityType, "edit")) throw new ApiError(403, "FORBIDDEN");

    await mkdir(UPLOAD_DIR, { recursive: true });
    const id = `f${secureToken(12)}`;
    const ext = path.extname(file.name).toLowerCase() || ".bin";
    const storagePath = path.join(UPLOAD_DIR, `${id}${ext}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    let thumbPath: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (IMAGE_TYPES.has(file.type)) {
      try {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(buffer).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
        // compressed main
        await sharp(buffer).rotate().resize(1600, 1600, { fit: "inside" }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, `${id}_main.webp`));
        // thumbnail
        await sharp(buffer).rotate().resize(400, 400, { fit: "cover" }).webp({ quality: 72 }).toFile(path.join(UPLOAD_DIR, `${id}_thumb.webp`));
        thumbPath = `${id}_thumb.webp`;
      } catch (e) {
        console.error("[sharp]", e);
      }
    }

    const rec = await prisma.file.create({
      data: {
        id,
        storagePath,
        thumbPath,
        originalName: file.name.slice(0, 200),
        mimeType: file.type,
        sizeBytes: file.size,
        width,
        height,
        entityType,
        entityId,
        category,
        caption,
        uploadedById: c.user.id,
      },
    });
    return ok({
      id: rec.id,
      originalName: rec.originalName,
      mimeType: rec.mimeType,
      sizeBytes: rec.sizeBytes,
      thumbPath: rec.thumbPath,
      category: rec.category,
      caption: rec.caption,
    }, 201);
  })(req);
}

/** GET list by entity */
export async function GET(req: NextRequest) {
  return handler(async (rq, c) => {
    const url = new URL(rq.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    if (!entityType || !entityId) throw new ApiError(400, "MISSING_ENTITY");
    if (!canAccessEntityFiles(c.user.role, entityType, "view")) throw new ApiError(403, "FORBIDDEN");
    const files = await prisma.file.findMany({
      where: { deletedAt: null, entityType, entityId },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, thumbPath: true, category: true, caption: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok(files);
  })(req);
}
