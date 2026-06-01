import { PortalRacunSettings } from "@/components/portal/PortalRacunSettings";
import { NastavitvePortalPassword } from "../nastavitve/NastavitvePortalPassword";
import { getPortalSession } from "@/lib/get-portal-session";
import { getDefaultNavPermissions } from "@/lib/nav-permissions";
import type { PortalRole } from "@/context/PortalRoleContext";

export default async function PortalRacunPage() {
  const session = await getPortalSession();
  const role: PortalRole = session?.role ?? "viewer";
  const navPermissions = session?.navPermissions ?? getDefaultNavPermissions(role);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-[env(safe-area-inset-bottom)]">
      <div>
        <h1 className="vo-page-title text-xl sm:text-2xl">Moj račun</h1>
        <p className="vo-page-desc mt-1 text-sm">
          Pregled dostopa, videz portala, bližnjice in sprememba gesla za prijavo v portal.
        </p>
      </div>

      <PortalRacunSettings
        username={session?.username ?? ""}
        role={role}
        mustChangePassword={session?.mustChangePassword ?? false}
        navPermissions={navPermissions}
      />

      <div id="sprememba-gesla">
        <NastavitvePortalPassword />
      </div>
    </div>
  );
}
