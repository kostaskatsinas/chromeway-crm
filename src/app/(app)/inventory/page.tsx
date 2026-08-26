import { InventoryTabs } from "@/components/modules/Inventory";

export default function InventoryPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Chromeway CRM</p>
        <h1 className="display text-4xl mt-1">Υλικά & Απόθεμα</h1>
      </div>
      <InventoryTabs />
    </div>
  );
}
