"use client";

import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";

export function ClientProfileGate({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  const { role } = usePortalRole();

  if (role === "client" && clientId !== mockClientPortalClientId) {
    return (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-8 text-center shadow-[var(--vo-card-shadow)]">
        <p className="text-[var(--vo-fg)]">Nimate dostopa do tega profila.</p>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">
          Strankin pogled je omejen na vaš objekt.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
