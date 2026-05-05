import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ClientWorkspace } from "@/components/portal/ClientWorkspace";
import { ClientProfileGate } from "./ClientProfileGate";
import { ProfileBackNav } from "./ProfileBackNav";
import { getClient } from "@/lib/repositories/clients";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function StrankaProfilPage({ params }: Props) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <ClientProfileGate clientId={id}>
      <div className="space-y-4">
        <ProfileBackNav />
        <Suspense
          fallback={<p className="text-sm text-[var(--vo-muted)]">Nalaganje delovnega prostora…</p>}
        >
          <ClientWorkspace initialClient={client} dbConfigured={isDbConfigured()} />
        </Suspense>
      </div>
    </ClientProfileGate>
  );
}
