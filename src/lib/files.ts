import path from "path";
import type { Role } from "@prisma/client";
import { can, type Capability } from "./rbac";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const FILE_CAPABILITIES: Record<string, { view: Capability; edit: Capability }> = {
  contact: { view: "contacts.view", edit: "contacts.edit" },
  company: { view: "companies.view", edit: "companies.edit" },
  siteVisit: { view: "visits.view", edit: "visits.edit" },
  project: { view: "projects.view", edit: "projects.edit" },
};

export function canAccessEntityFiles(role: Role, entityType: string | null, action: "view" | "edit") {
  if (role === "ADMIN") return true;
  const caps = entityType ? FILE_CAPABILITIES[entityType] : undefined;
  return Boolean(caps && can(role, caps[action]));
}
