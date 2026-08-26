import { ContactsTable } from "@/components/modules/Contacts";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";

export default async function ContactsPage() {
  const user = await requirePageCapability("contacts.view");
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Επαφές</h1>
      </div>
      <ContactsTable canEdit={can(user.role, "contacts.edit")} canDelete={can(user.role, "contacts.delete")} />
    </div>
  );
}
