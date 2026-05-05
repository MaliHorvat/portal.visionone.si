"use client";

import { usePortalRole } from "@/context/PortalRoleContext";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { role } = usePortalRole();
  if (role === "client") {
    return (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-8 text-center shadow-[var(--vo-card-shadow)]">
        <p className="font-medium text-[var(--vo-fg)]">Ta modul je na voljo le administratorjem.</p>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">
          Ta razdelek je rezerviran za administrativne račune. Če potrebujete dostop, kontaktirajte administratorja.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
