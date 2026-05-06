"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PortalUserRole } from "@/lib/portal-roles";

export type PortalRole = PortalUserRole;

type Ctx = {
  role: PortalRole;
  setRole: (r: PortalRole) => void;
  canSwitchRoles: boolean;
};

const PortalRoleContext = createContext<Ctx | null>(null);

export function PortalRoleProvider({
  children,
  initialRole = "admin",
  canSwitchRoles = false,
}: {
  children: React.ReactNode;
  /** Iz piškotka (strežnik): admin/operator/viewer. */
  initialRole?: PortalRole;
  /** Admin debug funkcija: lokalni preklop prikaza role v UI. */
  canSwitchRoles?: boolean;
}) {
  const [role, setRole] = useState<PortalRole>(initialRole);
  const value = useMemo(() => ({ role, setRole, canSwitchRoles }), [role, canSwitchRoles]);
  return (
    <PortalRoleContext.Provider value={value}>{children}</PortalRoleContext.Provider>
  );
}

export function usePortalRole() {
  const v = useContext(PortalRoleContext);
  if (!v) throw new Error("usePortalRole outside PortalRoleProvider");
  return v;
}
