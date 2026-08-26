import { notFound } from "next/navigation";
import { getSession, type SessionUser } from "./auth";
import { can, type Capability } from "./rbac";

/** Server-page guard for routes that read Prisma directly instead of going through an API. */
export async function requirePageCapability(capability: Capability): Promise<SessionUser> {
  const user = await getSession();
  if (!user || !can(user.role, capability)) notFound();
  return user;
}
