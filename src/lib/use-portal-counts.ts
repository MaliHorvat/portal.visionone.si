"use client";

import { useEffect, useState } from "react";

export type PortalNavCounts = {
  openRequests: number;
  urgentRequests: number;
  activeReminders: number;
  overdueReminders: number;
};

const EMPTY: PortalNavCounts = {
  openRequests: 0,
  urgentRequests: 0,
  activeReminders: 0,
  overdueReminders: 0,
};

export function usePortalNavCounts(enabled: boolean): PortalNavCounts {
  const [counts, setCounts] = useState<PortalNavCounts>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    const load = async () => {
      try {
        const [reqRes, remRes] = await Promise.all([
          fetch("/api/service-requests", { cache: "no-store" }),
          fetch("/api/reminders", { cache: "no-store" }),
        ]);
        let openRequests = 0;
        let urgentRequests = 0;
        if (reqRes.ok) {
          const j = (await reqRes.json()) as {
            requests?: Array<{ status: string; priority: string }>;
          };
          for (const r of j.requests ?? []) {
            if (r.status !== "done") {
              openRequests += 1;
              if (r.priority === "urgent" || r.priority === "high") urgentRequests += 1;
            }
          }
        }
        let activeReminders = 0;
        let overdueReminders = 0;
        const today = new Date().toISOString().slice(0, 10);
        if (remRes.ok) {
          const j = (await remRes.json()) as {
            reminders?: Array<{ completed: boolean; dueDate: string }>;
          };
          for (const r of j.reminders ?? []) {
            if (r.completed) continue;
            activeReminders += 1;
            if (r.dueDate && r.dueDate < today) overdueReminders += 1;
          }
        }
        setCounts({ openRequests, urgentRequests, activeReminders, overdueReminders });
      } catch {
        setCounts(EMPTY);
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return counts;
}
