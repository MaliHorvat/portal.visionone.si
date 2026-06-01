import { PortalRoleProvider } from "@/context/PortalRoleContext";
import { PortalToastProvider } from "@/context/PortalToastContext";
import { MojShell } from "@/components/moj/MojShell";
import { getPortalSession } from "@/lib/get-portal-session";
import { listClientsForSession } from "@/lib/repositories/clients";
import { getDefaultNavPermissions } from "@/lib/nav-permissions";

export default async function MojLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  const role = session?.role ?? "viewer";
  const clients = await listClientsForSession(session ?? undefined);
  const clientName = clients[0]?.name;

  return (
    <PortalRoleProvider
      initialRole={role}
      canSwitchRoles={false}
      navPermissions={session?.navPermissions ?? getDefaultNavPermissions(role)}
    >
      <PortalToastProvider>
        <MojShell clientName={clientName} isPreviewAdmin={role === "admin"}>
          {children}
        </MojShell>
      </PortalToastProvider>
    </PortalRoleProvider>
  );
}
