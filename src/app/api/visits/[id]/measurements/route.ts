import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit, ApiError } from "@/lib/api";

const schema = z.object({
  measurements: z.array(
    z.object({
      id: z.string().optional(),
      areaName: z.string().trim().min(1),
      surfaceType: z.string().nullish(),
      material: z.string().nullish(),
      lengthM: z.number().nullish(),
      widthM: z.number().nullish(),
      heightM: z.number().nullish(),
      areaM2: z.number().nullish(),
      condition: z.string().nullish(),
      prepRequired: z.string().nullish(),
      notes: z.string().nullish(),
    })
  ),
});

/** PUT /api/visits/{id}/measurements — replace full measurement set */
export const PUT = handler(async (req, c) => {
  const visitId = c.params.id;
  const body = await parseBody(req, schema);
  const before = await prisma.measurement.findMany({ where: { visitId }, select: { id: true } });
  const ownedIds = new Set(before.map((measurement) => measurement.id));
  if (body.measurements.some((measurement) => measurement.id && !ownedIds.has(measurement.id))) {
    throw new ApiError(400, "MEASUREMENT_VISIT_MISMATCH");
  }

  await prisma.$transaction([
    prisma.measurement.deleteMany({ where: { visitId, ...(body.measurements.some((m) => m.id) ? { id: { notIn: body.measurements.filter((m) => m.id).map((m) => m.id as string) } } : {}) } }),
    ...body.measurements
      .filter((m) => !m.id)
      .map((m) =>
        prisma.measurement.create({
          data: {
            visitId,
            areaName: m.areaName,
            surfaceType: m.surfaceType ?? null,
            material: m.material ?? null,
            lengthM: m.lengthM ?? null,
            widthM: m.widthM ?? null,
            heightM: m.heightM ?? null,
            areaM2: m.areaM2 ?? null,
            condition: m.condition ?? null,
            prepRequired: m.prepRequired ?? null,
            notes: m.notes ?? null,
          },
        })
      ),
    ...body.measurements
      .filter((m) => m.id)
      .map((m) =>
        prisma.measurement.update({
          where: { id: m.id },
          data: {
            areaName: m.areaName,
            surfaceType: m.surfaceType ?? null,
            material: m.material ?? null,
            lengthM: m.lengthM ?? null,
            widthM: m.widthM ?? null,
            heightM: m.heightM ?? null,
            areaM2: m.areaM2 ?? null,
            condition: m.condition ?? null,
            prepRequired: m.prepRequired ?? null,
            notes: m.notes ?? null,
          },
        })
      ),
  ]);

  await audit(c.user.id, "REPLACE", "measurements", visitId, before.map((b) => b.id), body.measurements.length);
  return ok({ count: body.measurements.length });
}, { capability: "visits.edit" });
