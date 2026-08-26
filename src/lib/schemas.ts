import { z } from "zod";

const nullableString = z.string().trim().max(5000);
const optNullable = (s = nullableString) => s.nullish().optional();

const dateish = z.union([z.string(), z.date()]).nullish();
const dec = z.union([z.number(), z.string()]).transform((v) => (v === "" || v === null ? null : Number(v)));

// ─── Contacts ───
export const contactCreate = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  companyId: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: optNullable(),
  mobile: optNullable(),
  position: optNullable(),
  businessType: z.enum(["PRIVATE_CUSTOMER", "ARCHITECT", "INTERIOR_DESIGNER", "CONTRACTOR", "HOTEL", "RESTAURANT", "RETAIL_BUSINESS", "OFFICE", "OTHER_BUSINESS"]).default("PRIVATE_CUSTOMER"),
  leadSource: z.enum(["WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE_SEARCH", "WALK_IN", "EXHIBITION", "PARTNER", "COLD_OUTREACH", "REPEAT_CUSTOMER", "OTHER"]).default("OTHER"),
  referredBy: optNullable(),
  street: optNullable(),
  city: optNullable(),
  postalCode: optNullable(),
  region: z.string().default("ATTICA"),
  preferredLanguage: z.enum(["el", "en"]).default("el"),
  gdprConsent: z.boolean().default(false),
  marketingOptIn: z.boolean().default(false),
  notes: optNullable(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
  ownerUserId: z.string().nullish(),
});
export const contactUpdate = contactCreate.partial();

// ─── Companies ───
export const companyCreate = z.object({
  name: z.string().trim().min(1),
  businessType: z.string().default("OTHER_BUSINESS"),
  vatNumber: optNullable(),
  taxOffice: optNullable(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: optNullable(),
  website: optNullable(),
  street: optNullable(),
  city: optNullable(),
  postalCode: optNullable(),
  region: z.string().default("ATTICA"),
  notes: optNullable(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
});
export const companyUpdate = companyCreate.partial();

// ─── Opportunities ───
export const opportunityCreate = z.object({
  title: z.string().trim().min(1),
  contactId: z.string().min(1),
  companyId: z.string().nullish(),
  projectName: optNullable(),
  address: optNullable(),
  city: optNullable(),
  region: z.string().default("ATTICA"),
  estimatedAreaM2: z.number().nullish(),
  surfaceMaterials: z.array(z.string()).default([]),
  requestedFinish: optNullable(),
  finishCategoryId: z.string().nullish(),
  serviceTypeId: z.string().nullish(),
  estimatedValue: dec.default(0),
  probability: z.number().int().min(0).max(100).default(30),
  expectedDecisionDate: dateish,
  source: z.string().default("OTHER"),
  assignedUserId: z.string().nullish(),
  stage: z.string().default("NEW_LEAD"),
  position: z.number().int().default(0),
  nextAction: optNullable(),
  nextActionDate: dateish,
  lossReason: z.string().nullish(),
  lossNotes: optNullable(),
  description: optNullable(),
  internalNotes: optNullable(),
});
export const opportunityUpdate = opportunityCreate.partial();

// ─── Site visits ───
export const visitCreate = z.object({
  title: z.string().trim().min(1),
  opportunityId: z.string().nullish(),
  contactId: z.string().min(1),
  projectId: z.string().nullish(),
  scheduledAt: z.union([z.string(), z.date()]),
  durationMin: z.number().int().default(60),
  status: z.string().default("SCHEDULED"),
  address: optNullable(),
  city: optNullable(),
  purpose: optNullable(),
  accessNotes: optNullable(),
  workingConditions: optNullable(),
  customerRequirements: optNullable(),
  generalNotes: optNullable(),
  assignedUserId: z.string().nullish(),
});
export const visitUpdate = visitCreate.partial();

export const measurementCreate = z.object({
  areaName: z.string().trim().min(1),
  surfaceType: optNullable(),
  material: optNullable(),
  lengthM: z.number().nullish(),
  widthM: z.number().nullish(),
  heightM: z.number().nullish(),
  areaM2: z.number().nullish(),
  quantityNote: optNullable(),
  condition: optNullable(),
  prepRequired: optNullable(),
  notes: optNullable(),
});

// ─── Finishes ───
export const finishCreate = z.object({
  code: z.string().trim().min(1),
  nameEl: z.string().trim().min(1),
  nameEn: z.string().trim().default(""),
  category: z.string().default("VENETIAN_PLASTER"),
  technique: optNullable(),
  applicationMethod: optNullable(),
  suitableSurfaces: z.array(z.string()).default([]),
  materialSuppliers: z.array(z.string()).default([]),
  colorCombinations: optNullable(),
  texture: optNullable(),
  glossLevel: z.string().default("MATTE"),
  materialCostPerM2: dec.default(0),
  suggestedPricePerM2: dec.default(0),
  labourHoursPerM2: z.number().default(1),
  applicationLayers: z.number().int().default(3),
  dryingHoursBetweenCoats: z.number().int().default(6),
  instructionsEl: optNullable(),
  instructionsEn: optNullable(),
  physicalSampleLocation: optNullable(),
  videoUrl: optNullable(),
  active: z.boolean().default(true),
});
export const finishUpdate = finishCreate.partial();

// ─── Samples ───
export const sampleCreate = z.object({
  finishId: z.string().min(1),
  opportunityId: z.string().nullish(),
  contactId: z.string().min(1),
  status: z.string().default("REQUESTED"),
  sizeLabel: optNullable(),
  productionCost: dec.default(0),
  priceCharged: dec.default(0),
  requestedDate: dateish,
  deliveryDate: dateish,
  feedback: optNullable(),
  feedbackRating: z.number().int().nullish(),
  approvedAt: dateish,
  rejectedReason: optNullable(),
  quotationId: z.string().nullish(),
  producedById: z.string().nullish(),
  notes: optNullable(),
});
export const sampleUpdate = sampleCreate.partial();

// ─── Projects & children ───
export const projectCreate = z.object({
  name: z.string().trim().min(1),
  quotationId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  contactId: z.string().min(1),
  companyId: z.string().nullish(),
  serviceTypeId: z.string().nullish(),
  managerUserId: z.string().nullish(),
  teamUserIds: z.array(z.string()).default([]),
  status: z.string().default("PLANNING"),
  contractValue: dec.default(0),
  estimatedCost: dec.default(0),
  estimatedHours: z.number().default(0),
  address: optNullable(),
  city: optNullable(),
  region: z.string().default("ATTICA"),
  scopeDescription: optNullable(),
  startDate: dateish,
  plannedEndDate: dateish,
  actualEndDate: dateish,
  progressPct: z.number().int().min(0).max(100).default(0),
  notes: optNullable(),
});
export const projectUpdate = projectCreate.partial();

export const taskCreate = z.object({
  projectId: z.string().nullish(),
  title: z.string().trim().min(1),
  description: optNullable(),
  milestone: z.boolean().default(false),
  dependsOnTaskId: z.string().nullish(),
  status: z.string().default("TODO"),
  priority: z.string().default("MEDIUM"),
  assigneeUserId: z.string().nullish(),
  dueDate: dateish,
  reminderAt: dateish,
  position: z.number().int().default(0),
});
export const taskUpdate = taskCreate.partial();

export const worklogUpsert = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  date: z.union([z.string(), z.date()]),
  hours: z.number().min(0).max(24),
  note: optNullable(),
  hasIssue: z.boolean().default(false),
  issueNote: optNullable(),
});

export const changeOrderCreate = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1),
  description: optNullable(),
  amount: dec.default(0),
  cost: dec.default(0),
  approved: z.boolean().default(false),
});

// ─── Calendar events ───
export const eventCreate = z.object({
  title: z.string().trim().min(1),
  type: z.string().default("OTHER_EVENT"),
  start: z.union([z.string(), z.date()]),
  end: z.union([z.string(), z.date()]).nullish(),
  allDay: z.boolean().default(false),
  assignedUserId: z.string().nullish(),
  extraUserIds: z.array(z.string()).default([]),
  contactId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  projectId: z.string().nullish(),
  visitId: z.string().nullish(),
  taskId: z.string().nullish(),
  invoiceId: z.string().nullish(),
  location: optNullable(),
  notes: optNullable(),
  reminderMinBefore: z.number().int().default(60),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceInterval: z.number().int().default(1),
  recurrenceUntil: dateish,
});
export const eventUpdate = eventCreate.partial();

// ─── Inventory ───
export const supplierCreate = z.object({
  name: z.string().trim().min(1),
  contactName: optNullable(),
  phone: optNullable(),
  email: z.string().email().nullish().or(z.literal("")),
  address: optNullable(),
  vatNumber: optNullable(),
  website: optNullable(),
  notes: optNullable(),
  active: z.boolean().default(true),
});
export const supplierUpdate = supplierCreate.partial();

export const materialCreate = z.object({
  code: z.string().trim().min(1),
  nameEl: z.string().trim().min(1),
  nameEn: z.string().trim().default(""),
  category: optNullable(),
  unit: z.string().default("KG"),
  supplierId: z.string().nullish(),
  lastPurchasePrice: dec.default(0),
  avgPurchasePrice: dec.default(0),
  minStock: z.number().default(0),
  batchTracking: z.boolean().default(false),
  notes: optNullable(),
  active: z.boolean().default(true),
});
export const materialUpdate = materialCreate.partial();

export const stockAdjust = z.object({
  materialId: z.string().min(1),
  quantity: z.number(),
  type: z.enum(["PURCHASE_IN", "CONSUMPTION_OUT", "ADJUSTMENT", "RETURN"]),
  projectId: z.string().nullish(),
  batchNo: optNullable(),
  note: optNullable(),
});

export const reservationCreate = z.object({
  projectId: z.string().min(1),
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  note: optNullable(),
});

export const purchaseCreate = z.object({
  supplierId: z.string().nullish(),
  projectId: z.string().nullish(),
  invoiceNumber: optNullable(),
  date: z.union([z.string(), z.date()]),
  notes: optNullable(),
  items: z
    .array(
      z.object({
        materialId: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        batchNo: optNullable(),
      })
    )
    .min(1),
});

// ─── Finance ───
export const expenseCreate = z.object({
  projectId: z.string().nullish(),
  category: z.string().default("MATERIALS_EXPENSE"),
  description: z.string().trim().min(1),
  vendor: optNullable(),
  amount: dec.refine((v): v is number => v !== null && v >= 0),
  vatAmount: dec.default(0),
  date: z.union([z.string(), z.date()]),
  paid: z.boolean().default(true),
  reimbursed: z.boolean().default(false),
});
export const expenseUpdate = expenseCreate.partial();

export const paymentCreate = z.object({
  invoiceId: z.string().nullish(),
  projectId: z.string().nullish(),
  contactId: z.string().nullish(),
  amount: dec.refine((v): v is number => v !== null && v > 0, "Payment amount must be positive"),
  method: z.string().default("BANK_TRANSFER"),
  paidAt: z.union([z.string(), z.date()]),
  reference: optNullable(),
  notes: optNullable(),
});

// ─── Users & settings ───
export const userCreate = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: optNullable(),
  role: z.enum(["ADMIN", "SALES", "PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT", "COLLABORATOR"]),
  hourlyRate: dec.default(0),
  color: z.string().default("#8a7968"),
  active: z.boolean().default(true),
});
export const userUpdate = userCreate.partial().omit({ password: true }).extend({
  password: z.string().min(8).nullish(),
  currentPassword: z.string().nullish(),
});

export const activityCreate = z.object({
  kind: z.enum(["CALL", "EMAIL", "SMS", "MEETING_LOG", "NOTE"]),
  direction: z.enum(["in", "out"]).nullish(),
  subject: optNullable(),
  body: optNullable(),
  occurredAt: z.union([z.string(), z.date()]).optional(),
  durationMin: z.number().int().nullish(),
  contactId: z.string().nullish(),
  companyId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  quotationId: z.string().nullish(),
  projectId: z.string().nullish(),
});

export const commentCreate = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  body: z.string().trim().min(1),
  mentions: z.array(z.string()).default([]),
});

export const serviceTypeCreate = z.object({
  nameEl: z.string().trim().min(1),
  nameEn: z.string().trim().default(""),
  color: z.string().default("#8a7968"),
  active: z.boolean().default(true),
});
