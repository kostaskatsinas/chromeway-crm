import { FinanceTabs } from "@/components/modules/Finance";

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedTab = typeof params.tab === "string" ? params.tab : "invoices";
  const initialTab = ["invoices", "payments", "expenses"].includes(requestedTab) ? requestedTab : "invoices";
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Οικονομικά</h1>
      </div>
      <FinanceTabs
        initialTab={initialTab as "invoices" | "payments" | "expenses"}
        initialOpen={typeof params.open === "string" ? params.open : undefined}
        initialNew={params.new === "1"}
        initialStatus={typeof params.status === "string" ? params.status : undefined}
      />
    </div>
  );
}
