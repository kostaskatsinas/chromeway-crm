import type { Role } from "@prisma/client";

/**
 * Permission matrix. Keys are capabilities; values are roles allowed.
 * ADMIN implicitly has every capability.
 */
export type Capability =
  | "dashboard.view"
  | "contacts.view" | "contacts.edit" | "contacts.delete" | "contacts.export"
  | "companies.view" | "companies.edit" | "companies.delete"
  | "pipeline.view" | "pipeline.edit" | "pipeline.delete"
  | "visits.view" | "visits.edit" | "visits.delete"
  | "catalogue.view" | "catalogue.edit"
  | "samples.view" | "samples.edit"
  | "quotes.view" | "quotes.edit" | "quotes.costs" | "quotes.delete"
  | "projects.view" | "projects.edit" | "projects.financials" | "projects.delete"
  | "calendar.view" | "calendar.edit"
  | "inventory.view" | "inventory.edit" | "inventory.purchases"
  | "finance.view" | "finance.viewAmounts" | "finance.edit" | "finance.export"
  | "tasks.view" | "tasks.edit"
  | "reports.view" | "reports.financial" | "reports.export"
  | "settings.view" | "settings.users" | "settings.system" | "audit.view";

const MATRIX: Record<Capability, Role[]> = {
  "dashboard.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT", "COLLABORATOR"],
  "contacts.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT"],
  "contacts.edit": ["SALES", "PROJECT_MANAGER"],
  "contacts.delete": ["PROJECT_MANAGER"],
  "contacts.export": ["SALES", "PROJECT_MANAGER"],
  "companies.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT"],
  "companies.edit": ["SALES", "PROJECT_MANAGER"],
  "companies.delete": ["PROJECT_MANAGER"],
  "pipeline.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "pipeline.edit": ["SALES", "PROJECT_MANAGER"],
  "pipeline.delete": ["PROJECT_MANAGER"],
  "visits.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "visits.edit": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "visits.delete": ["PROJECT_MANAGER"],
  "catalogue.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "catalogue.edit": ["PROJECT_MANAGER"],
  "samples.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "samples.edit": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "quotes.view": ["SALES", "PROJECT_MANAGER"],
  "quotes.edit": ["SALES", "PROJECT_MANAGER"],
  "quotes.costs": ["ADMIN", "PROJECT_MANAGER"],
  "quotes.delete": ["PROJECT_MANAGER"],
  "projects.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "COLLABORATOR"],
  "projects.edit": ["PROJECT_MANAGER"],
  "projects.financials": ["ADMIN", "PROJECT_MANAGER", "ACCOUNTANT"],
  "projects.delete": ["ADMIN", "PROJECT_MANAGER"],
  "calendar.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "COLLABORATOR", "ACCOUNTANT"],
  "calendar.edit": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "inventory.view": ["PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT"],
  "inventory.edit": ["PROJECT_MANAGER", "TECHNICIAN"],
  "inventory.purchases": ["PROJECT_MANAGER", "ACCOUNTANT"],
  "finance.view": ["ADMIN", "ACCOUNTANT", "PROJECT_MANAGER"],
  "finance.viewAmounts": ["ADMIN", "ACCOUNTANT", "PROJECT_MANAGER"],
  "finance.edit": ["ADMIN", "ACCOUNTANT"],
  "finance.export": ["ADMIN", "ACCOUNTANT"],
  "tasks.view": ["SALES", "PROJECT_MANAGER", "TECHNICIAN", "COLLABORATOR", "ACCOUNTANT"],
  "tasks.edit": ["SALES", "PROJECT_MANAGER", "TECHNICIAN"],
  "reports.view": ["SALES", "PROJECT_MANAGER", "ACCOUNTANT"],
  "reports.financial": ["ADMIN", "ACCOUNTANT", "PROJECT_MANAGER"],
  "reports.export": ["ADMIN", "SALES", "PROJECT_MANAGER", "ACCOUNTANT"],
  "settings.view": [],
  "settings.users": [],
  "settings.system": [],
  "audit.view": [],
};

export function can(role: Role, capability: Capability): boolean {
  if (role === "ADMIN") return true;
  return MATRIX[capability].includes(role);
}

export function canAny(role: Role, capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(role, c));
}
