import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ClientWorkspace } from "@/components/portal/ClientWorkspace";
import { parseWorkspaceTab } from "@/components/portal/client-workspace/types";
import { ClientProfileGate } from "./ClientProfileGate";
import { ProfileBackNav } from "./ProfileBackNav";
import { getClient } from "@/lib/repositories/clients";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function StrankaProfilPage({ params, searchParams }: Props) {
  const { slug: slugParam } = await params;
  const sp = await searchParams;
  const initialTab = parseWorkspaceTab(sp?.tab);
  const client = await getClient(slugParam);
  if (!client) notFound();

  if (client.slug && slugParam === client.id) {
    const qs = sp?.tab ? `?tab=${encodeURIComponent(sp.tab)}` : "";
    redirect(`/portal/stranke/${encodeURIComponent(client.slug)}${qs}`);
  }

  return (
    <ClientProfileGate clientId={client.id}>
      <div className="space-y-4">
        <ProfileBackNav />
        <Suspense
          fallback={<p className="text-sm text-[var(--vo-muted)]">Nalaganje delovnega prostora…</p>}
        >
          <ClientWorkspace initialClient={client} dbConfigured={isDbConfigured()} initialTab={initialTab} />
        </Suspense>
      </div>
    </ClientProfileGate>
  );
}
