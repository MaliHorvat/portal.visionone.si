import { notFound } from "next/navigation";
import { NetworkTopology } from "@/components/portal/NetworkTopology";
import { RackView } from "@/components/portal/RackView";
import { ClientProfileGate } from "./ClientProfileGate";
import { ProfileBackNav } from "./ProfileBackNav";
import { mockTopologyEdges, mockTopologyNodes, mockRackUnits } from "@/lib/mock-data";
import { getClient } from "@/lib/repositories/clients";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function StrankaProfilPage({ params }: Props) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <ClientProfileGate clientId={id}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <ProfileBackNav />
            <h1 className="mt-2 text-2xl font-bold text-[var(--vo-fg)]">{client.name}</h1>
            <p className="mt-1 text-sm text-[var(--vo-muted)]">{client.address}</p>
          </div>
          <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-2 text-sm">
            <span className="text-[var(--vo-muted)]">Paket: </span>
            <span className="font-medium text-[var(--vo-fg)]">
              {client.package?.name ?? "—"}
            </span>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Kamere</h2>
            {client.cameras.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--vo-muted)]">Ni kamer.</p>
            ) : (
              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-[var(--vo-muted)]">
                  <tr>
                    <th className="py-1">Ime</th>
                    <th className="py-1">IP</th>
                    <th className="py-1">Model</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {client.cameras.map((cam) => (
                    <tr key={cam.id} className="border-t border-[var(--vo-border)]">
                      <td className="py-2 text-[var(--vo-fg)]">{cam.name}</td>
                      <td className="py-2 font-mono text-[var(--vo-muted)]">{cam.ip}</td>
                      <td className="py-2 text-[var(--vo-muted)]">{cam.model}</td>
                      <td className="py-2">
                        <span
                          className={
                            cam.status === "online"
                              ? "text-[var(--vo-ok)]"
                              : "text-[var(--vo-danger)]"
                          }
                        >
                          {cam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Snemalniki (NVR)</h2>
            {client.nvrs.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--vo-muted)]">Ni snemalnikov.</p>
            ) : (
              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-[var(--vo-muted)]">
                  <tr>
                    <th className="py-1">Ime</th>
                    <th className="py-1">IP</th>
                    <th className="py-1">TB</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {client.nvrs.map((n) => (
                    <tr key={n.id} className="border-t border-[var(--vo-border)]">
                      <td className="py-2 text-[var(--vo-fg)]">{n.name}</td>
                      <td className="py-2 font-mono text-[var(--vo-muted)]">{n.ip}</td>
                      <td className="py-2 text-[var(--vo-muted)]">{n.diskTb}</td>
                      <td className="py-2 text-[var(--vo-ok)]">{n.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Stikala</h2>
            {client.switches.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--vo-muted)]">Ni stikal.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {client.switches.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between gap-2 border-b border-[var(--vo-border)] pb-2 last:border-0"
                  >
                    <span className="text-[var(--vo-fg)]">{s.name}</span>
                    <span className="font-mono text-xs text-[var(--vo-muted)]">{s.ip}</span>
                    <span className="text-xs text-[var(--vo-muted)]">{s.ports}p</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Diski</h2>
            {client.disks.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--vo-muted)]">Ni diskov.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {client.disks.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-[var(--vo-border)] pb-2 last:border-0"
                  >
                    <span className="text-[var(--vo-fg)]">{d.label}</span>
                    <span className="text-[var(--vo-muted)]">{d.sizeTb} TB</span>
                    <span className="text-xs text-[var(--vo-muted)]">{d.installedAt}</span>
                    <span
                      className={
                        d.health === "ok"
                          ? "text-[var(--vo-ok)]"
                          : d.health === "warn"
                            ? "text-[var(--vo-warn)]"
                            : "text-[var(--vo-danger)]"
                      }
                    >
                      {d.health}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <NetworkTopology nodes={mockTopologyNodes} edges={mockTopologyEdges} />
          <RackView units={mockRackUnits} />
        </section>
      </div>
    </ClientProfileGate>
  );
}
