import { PipelineBoard } from "@/components/modules/Pipeline";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";

export default async function PipelinePage() {
  const user = await requirePageCapability("pipeline.view");
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Pipeline πωλήσεων</h1>
      </div>
      <PipelineBoard currentUserId={user.id} canEdit={can(user.role, "pipeline.edit")} />
    </div>
  );
}
