"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type PortalRole = "admin" | "client";

type Ctx = {
  role: PortalRole;
  setRole: (r: PortalRole) => void;
};

const PortalRoleContext = createContext<Ctx | null>(null);

export function PortalRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<PortalRole>("admin");
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
