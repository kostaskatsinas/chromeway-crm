import { QuoteBuilder } from "@/components/modules/QuoteBuilder";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="max-w-[1400px] mx-auto">
      <QuoteBuilder
        initialHeader={{
          contactId: sp.contact || undefined,
          opportunityId: sp.opportunity || undefined,
          projectName: "",
        }}
        initialItems={[]}
      />
    </div>
  );
}
