import { AdminGate } from "@/components/portal/AdminGate";
import { mockInventory } from "@/lib/mock-data";

export default function InventarPage() {
  return (
    <AdminGate>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Inventar</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Zaloga in minimalne zaloge — pripravljeno za sinhronizacijo z Go skladiščem.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Količina</th>
              <th className="px-4 py-3 font-medium">Minimum</th>
              <th className="px-4 py-3 font-medium">Enota</th>
              <th className="px-4 py-3 font-medium">Opozorilo</th>
            </tr>
          </thead>
          <tbody>
            {mockInventory.map((row) => {
              const low = row.qty <= row.minQty;
              return (
                <tr key={row.id} className="border-b border-[var(--vo-border)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--vo-fg)]">{row.sku}</td>
                  <td className="px-4 py-3 text-[var(--vo-fg)]">{row.name}</td>
                  <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{row.qty}</td>
                  <td className="px-4 py-3 text-[var(--vo-muted)]">{row.minQty}</td>
                  <td className="px-4 py-3 text-[var(--vo-muted)]">{row.unit}</td>
                  <td className="px-4 py-3">
                    {low ? (
                      <span className="rounded-full bg-[var(--vo-danger-muted)] px-2 py-0.5 text-xs font-medium text-[var(--vo-danger)]">
                        Pod minimumom
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--vo-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </AdminGate>
  );
}
