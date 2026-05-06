"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PortalUserRole } from "@/lib/portal-roles";

export type PortalRole = PortalUserRole;

type Ctx = {
  role: PortalRole;
  setRole: (r: PortalRole) => void;
};

const PortalRoleContext = createContext<Ctx | null>(null);

export function PortalRoleProvider({
  children,
  initialRole = "admin",
}: {
  children: React.ReactNode;
  /** Iz piškotka (strežnik): admin/operator/viewer. */
  initialRole?: PortalRole;
}) {
  const [role, setRole] = useState<PortalRole>(initialRole);
  const value = useMemo(() => ({ role, setRole }), [role]);
  return (
    <PortalRoleContext.Provider value={value}>{children}</PortalRoleContext.Provider>
  );
}

export function usePortalRole() {
  const v = useContext(PortalRoleContext);
  if (!v) throw new Error("usePortalRole outside PortalRoleProvider");
  return v;
}
