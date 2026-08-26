import { CatalogueTabs } from "@/components/modules/Catalogue";

export default function CataloguePage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Φινιρίσματα & Δείγματα</h1>
      </div>
      <CatalogueTabs />
    </div>
  );
}
