import { AdminGate } from "@/components/portal/AdminGate";
import { NastavitveUporabniki } from "./NastavitveUporabniki";

export default function NastavitvePage() {
  return (
    <AdminGate>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Nastavitve</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--vo-muted)]">
            Funkcije iz namizne aplikacije VisionOne se uvajajo postopoma. Zbirka v{" "}
            <code className="rounded bg-[var(--vo-surface-2)] px-1 py-0.5 text-xs">9.04.2026/VisionOne</code>{" "}
            obsega veliko več (ponudbe, inventar, merjenje časa, WoL, ankete, skener …); ta razdelek začenja z
            upravljanjem portalnih računov.
          </p>
        </div>

        <NastavitveUporabniki />
      </div>
    </AdminGate>
  );
}
