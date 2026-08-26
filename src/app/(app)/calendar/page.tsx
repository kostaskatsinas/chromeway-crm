import { CalendarView } from "@/components/modules/Calendar";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Chromeway CRM</p>
          <h1 className="display text-4xl mt-1">Ημερολόγιο</h1>
        </div>
      </div>
      <CalendarView />
    </div>
  );
}
