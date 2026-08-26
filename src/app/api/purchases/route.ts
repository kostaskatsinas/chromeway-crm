import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit } from "@/lib/api";
import { purchaseCreate } from "@/lib/schemas";

 

/** POST /api/purchases — creates purchase, items, stock-in movements & updates material prices/stock atomically */
export const POST = handler(async (req: NextRequest) => {
  return handler(async (rq, c) => {
    const body = await parseBody(rq, purchaseCreate);
    const total = body.items.reduce((s, it) => s + it.quantity * Number(it.unitPrice), 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          supplierId: body.supplierId ?? null,
          projectId: body.projectId ?? null,
          invoiceNumber: body.invoiceNumber ?? null,
          date: new Date(body.date),
          notes: body.notes ?? null,
          total,
          createdById: c.user.id,
        },
        include: { items: true, supplier: true },
      });

      for (const item of body.items) {
        await tx.purchaseItem.create({
          data: { purchaseId: p.id, materialId: item.materialId, quantity: item.quantity, unitPrice: Number(item.unitPrice), batchNo: item.batchNo ?? null },
        });
        await tx.stockMovement.create({
          data: {
            materialId: item.materialId,
            type: "PURCHASE_IN",
            quantity: item.quantity,
            purchaseId: p.id,
            batchNo: item.batchNo ?? null,
            userId: c.user.id,
            note: `Αγορά ${p.invoiceNumber ?? ""}`.trim(),
          },
        });
        await tx.material.update({
          where: { id: item.materialId },
          data: {
            currentStock: { increment: item.quantity },
            lastPurchasePrice: Number(item.unitPrice),
          },
        });
      }

      // Recompute average price per material
      for (const item of body.items) {
        const mat = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!mat) continue;
        const oldQty = Math.max(0, mat.currentStock - item.quantity);
        const oldAvg = Number(mat.avgPurchasePrice);
        const newAvg = oldQty + item.quantity > 0 ? (oldQty * oldAvg + item.quantity * Number(item.unitPrice)) / (oldQty + item.quantity) : Number(item.unitPrice);
        await tx.material.update({ where: { id: item.materialId }, data: { avgPurchasePrice: Math.round(newAvg * 100) / 100 } });
      }
      return p;
    });

    await audit(c.user.id, "CREATE", "purchase", purchase.id, null, purchase, { ip: rq.headers.get("x-forwarded-for") });
    return ok(purchase, 201);
  })(req);
}, { capability: "inventory.purchases" });

/** GET /api/purchases */
export const GET = handler(async () => {
  const items = await prisma.purchase.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
    include: { supplier: { select: { name: true } }, items: { include: { material: { select: { code: true, nameEl: true, unit: true } } } }, _count: { select: { items: true } } },
    take: 100,
  });
  return ok(items);
}, { capability: "inventory.view" });
