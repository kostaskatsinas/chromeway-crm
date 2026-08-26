"use client";

import { useEffect } from "react";

/** Client-side trigger for the hourly automation run (fire & forget). */
export function DashboardStrings({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const last = localStorage.getItem("cw_automation_run");
    if (!last || Date.now() - parseInt(last) > 45 * 60 * 1000) {
      fetch("/api/cron/run")
        .then((response) => {
          if (response.ok) localStorage.setItem("cw_automation_run", String(Date.now()));
        })
        .catch(() => {});
    }
  }, [enabled]);
  return null;
}
