import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SettingsTabs } from "@/components/modules/Settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await getSession())!;
  const setting = user.role === "ADMIN" ? await prisma.setting.findFirst() : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Ρυθμίσεις</h1>
      </div>
      <SettingsTabs me={user} initialSettings={(setting?.data as Record<string, unknown>) ?? {}} />
    </div>
  );
}
