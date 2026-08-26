import { prisma } from "@/lib/db";
import { handler, ok, parseBody } from "@/lib/api";
import { stockAdjust } from "@/lib/schemas";

/** POST /api/inventory/movement — consumption / adjustment / return with stock update */
export const POST = handler(async (req) => {
  return handler(async (rq, c) => {
    const body = await parseBody(rq, stockAdjust);
    const material = await prisma.material.findUniqueOrThrow({ where: { id: body.materialId } });

    const delta = body.type === "ADJUSTMENT"
      ? body.quantity
      : body.type === "CONSUMPTION_OUT"
        ? -Math.abs(body.quantity)
        : Math.abs(body.quantity);

    const updatedMaterial = await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          materialId: body.materialId,
          type: body.type,
          quantity: body.type === "ADJUSTMENT" ? body.quantity : Math.abs(body.quantity),
          projectId: body.projectId ?? null,
          batchNo: body.batchNo ?? null,
          note: body.note ?? null,
          userId: c.user.id,
        },
      });
      return tx.material.update({
        where: { id: body.materialId },
        data: { currentStock: { increment: delta } },
        select: { currentStock: true },
      });
    });
    const newStock = updatedMaterial.currentStock;

    // Low-stock notification to PMs
    if (newStock <= material.minStock) {
      const pms = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "PROJECT_MANAGER"] }, active: true, deletedAt: null }, select: { id: true } });
      for (const u of pms) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: "STOCK_LOW",
            title: `Χαμηλό απόθεμα: ${material.nameEl}`,
            body: `Απόθεμα ${Math.round(newStock * 100) / 100} ${material.unit} ≤ ελάχιστο ${material.minStock}`,
            link: "/inventory",
            entityType: "material",
            entityId: material.id,
          },
        });
      }
    }

    void rq;
    return ok({ newStock });
  })(req);
}, { capability: "inventory.edit" });

/** GET /api/inventory/movement?materialId= — movement history */
export const GET = handler(async (req) => {
  const materialId = new URL(req.url).searchParams.get("materialId");
  if (!materialId) return ok([]);
  const items = await prisma.stockMovement.findMany({
    where: { materialId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(items);
}, { capability: "inventory.view" });
