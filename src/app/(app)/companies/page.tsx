import { CompaniesTable } from "@/components/modules/Companies";

export default function CompaniesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Επιχειρήσεις</h1>
      </div>
      <CompaniesTable />
    </div>
  );
}
