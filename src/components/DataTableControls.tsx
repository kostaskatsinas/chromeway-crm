"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox } from "@/components/ui";

export type TableColumn = { key: string; label: string; locked?: boolean };
export type TableDensity = "compact" | "comfortable";

export function useTablePreferences(storageKey: string, columns: TableColumn[], defaultVisible?: string[]) {
  const defaults = useMemo(() => defaultVisible ?? columns.map((column) => column.key), [columns, defaultVisible]);
  const [visible, setVisible] = useState<string[]>(defaults);
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { visible?: string[]; density?: TableDensity } | null;
      if (saved?.visible) {
        const allowed = new Set(columns.map((column) => column.key));
        const restored = saved.visible.filter((key) => allowed.has(key));
        const locked = columns.filter((column) => column.locked).map((column) => column.key);
        setVisible(Array.from(new Set([...locked, ...restored])));
      }
      if (saved?.density === "compact" || saved?.density === "comfortable") setDensity(saved.density);
    } catch {}
    setReady(true);
  }, [columns, storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify({ visible, density }));
  }, [density, ready, storageKey, visible]);

  const toggleColumn = (key: string) => {
    const column = columns.find((candidate) => candidate.key === key);
    if (column?.locked) return;
    setVisible((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  return {
    visible,
    density,
    setDensity,
    toggleColumn,
    isVisible: (key: string) => visible.includes(key),
  };
}

export function TableViewControls({
  columns,
  visible,
  onToggleColumn,
  density,
  onDensity,
}: {
  columns: TableColumn[];
  visible: string[];
  onToggleColumn: (key: string) => void;
  density: TableDensity;
  onDensity: (density: TableDensity) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center rounded-lg border border-line bg-surface">
      <button type="button" className="btn btn-ghost btn-sm rounded-r-none border-r border-line" onClick={() => onDensity(density === "compact" ? "comfortable" : "compact")} title="Πυκνότητα γραμμών">
        {density === "compact" ? "≡ Πυκνή" : "☰ Άνετη"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm rounded-l-none" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>⚙ Στήλες</button>
      {open && (
        <div role="menu" className="card absolute right-0 top-10 z-30 w-56 p-3 shadow-pop">
          <p className="eyebrow mb-2">Ορατές στήλες</p>
          <div className="space-y-2">
            {columns.map((column) => (
              <Checkbox key={column.key} checked={visible.includes(column.key)} disabled={column.locked} onChange={() => onToggleColumn(column.key)} label={column.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BulkActionBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="sticky top-16 z-20 card border-clay/30 bg-clay-soft/90 backdrop-blur px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-pop">
      <span className="text-[13px] font-semibold">{count} επιλεγμένα</span>
      <div className="flex-1" />
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>Καθαρισμός</Button>
    </div>
  );
}
