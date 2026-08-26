import { VisitsTable } from "@/components/modules/Visits";

export default function VisitsPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Επισκέψεις χώρου</h1>
      </div>
      <VisitsTable />
    </div>
  );
}
