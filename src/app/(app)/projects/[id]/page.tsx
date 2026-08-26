import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";
import { ProjectDetail, type ProjectDetailData } from "@/components/modules/ProjectDetail";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const requestedTab = typeof query.tab === "string" ? query.tab : "overview";
  const user = await requirePageCapability("projects.view");
  const canSeeMoney = can(user.role, "projects.financials");
  const canEditProject = can(user.role, "projects.edit");
  const canEditTasks = can(user.role, "tasks.edit");

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      quotation: { select: { number: true } },
    },
  });
  if (!project) notFound();

  const users = (await prisma.user.findMany({ where: { deletedAt: null, active: true }, select: { id: true, firstName: true, lastName: true, color: true }, orderBy: { firstName: "asc" } }));

  const data: ProjectDetailData = {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    contractValue: canSeeMoney ? String(project.contractValue) : "0",
    estimatedCost: canSeeMoney ? String(project.estimatedCost) : "0",
    estimatedHours: project.estimatedHours,
    address: project.address,
    city: project.city,
    scopeDescription: project.scopeDescription,
    startDate: project.startDate?.toISOString() ?? null,
    plannedEndDate: project.plannedEndDate?.toISOString() ?? null,
    actualEndDate: project.actualEndDate?.toISOString() ?? null,
    progressPct: project.progressPct,
    qcChecklist: (project.qcChecklist as unknown as ProjectDetailData["qcChecklist"]) ?? [],
    customerApproved: project.customerApproved,
    notes: project.notes,
    contactId: project.contactId,
    contactName: `${project.contact.firstName} ${project.contact.lastName}`,
    managerUserId: project.managerUserId,
    teamUserIds: project.teamUserIds,
  };

  return (
    <ProjectDetail
      data={data}
      users={users}
      canSeeMoney={canSeeMoney}
      canEditProject={canEditProject}
      canEditTasks={canEditTasks}
      currentUserId={user.id}
      initialTab={requestedTab}
    />
  );
}
