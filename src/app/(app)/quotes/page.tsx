import { QuotesTable } from "@/components/modules/Quotes";

export default function QuotesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Προσφορές</h1>
      </div>
      <QuotesTable />
    </div>
  );
}
