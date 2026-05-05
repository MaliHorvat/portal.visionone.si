import { PortalRoleProvider } from "@/context/PortalRoleContext";
import { PortalShell } from "@/components/portal/PortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalRoleProvider>
      <PortalShell>{children}</PortalShell>
    </PortalRoleProvider>
  );
}
