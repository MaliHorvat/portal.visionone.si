import { AdminGate } from "@/components/portal/AdminGate";
import Link from "next/link";
import { NastavitveUporabniki } from "./NastavitveUporabniki";
import { PortalAccessRequestsPanel } from "./PortalAccessRequestsPanel";

export default function NastavitvePage() {
  return (
    <AdminGate>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Nastavitve</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--vo-muted)]">
            Upravljanje portalnih računov in dostopov.{" "}
            <Link href="/portal/racun" className="font-medium text-[var(--vo-accent)] hover:underline">
              Sprememba portala gesla
            </Link>{" "}
            je na strani Moj račun.
          </p>
        </div>

        <PortalAccessRequestsPanel />
        <NastavitveUporabniki />
      </div>
    </AdminGate>
  );
}
