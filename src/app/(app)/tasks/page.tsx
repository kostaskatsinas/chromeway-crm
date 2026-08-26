import { TaskBoard } from "@/components/modules/Tasks";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";

export default async function TasksPage() {
  const user = await requirePageCapability("tasks.view");
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Εργασίες</h1>
      </div>
      <div className="max-w-4xl">
        <TaskBoard currentUserId={user.id} canEdit={can(user.role, "tasks.edit")} />
      </div>
    </div>
  );
}
