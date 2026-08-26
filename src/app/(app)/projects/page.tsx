import { ProjectsTable } from "@/components/modules/Projects";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requirePageCapability("projects.view");
  const canSeeMoney = ["ADMIN", "PROJECT_MANAGER", "ACCOUNTANT"].includes(user.role);
  const canEdit = can(user.role, "projects.edit");
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Έργα</h1>
      </div>
      <ProjectsTable canSeeMoney={canSeeMoney} canEdit={canEdit} />
    </div>
  );
}
