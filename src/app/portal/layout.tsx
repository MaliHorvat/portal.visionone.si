import { PortalRoleProvider } from "@/context/PortalRoleContext";
import { PortalToastProvider } from "@/context/PortalToastContext";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalSession } from "@/lib/get-portal-session";
import type { PortalRole } from "@/context/PortalRoleContext";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  const initialRole: PortalRole = session?.isAdmin ? "admin" : "client";

  return (
    <PortalRoleProvider initialRole={initialRole}>
      <PortalToastProvider>
        <PortalShell>{children}</PortalShell>
      </PortalToastProvider>
    </PortalRoleProvider>
  );
}
