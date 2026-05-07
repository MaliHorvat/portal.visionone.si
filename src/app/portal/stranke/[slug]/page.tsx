import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ClientWorkspace } from "@/components/portal/ClientWorkspace";
import { parseWorkspaceTab } from "@/components/portal/client-workspace/types";
import { ClientProfileGate } from "./ClientProfileGate";
import { ProfileBackNav } from "./ProfileBackNav";
import { isDbConfigured } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { getClientForSession } from "@/lib/repositories/clients";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function StrankaProfilPage({ params, searchParams }: Props) {
  const { slug: slugParam } = await params;
  const session = await getPortalSession();
  const sp = await searchParams;
  const initialTab = parseWorkspaceTab(sp?.tab);
  const client = await getClientForSession(slugParam, session ?? undefined);
  if (!client) notFound();

  if (client.slug && slugParam === client.id) {
    const qs = sp?.tab ? `?tab=${encodeURIComponent(sp.tab)}` : "";
    redirect(`/portal/stranke/${encodeURIComponent(client.slug)}${qs}`);
  }

  return (
    <ClientProfileGate clientId={client.id}>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="md:sticky md:top-4 md:self-start">
          <ProfileBackNav />
        </div>
        <div className="min-w-0 space-y-4">
          <Suspense fallback={<p className="text-sm text-[var(--vo-muted)]">Nalaganje delovnega prostora…</p>}>
            <ClientWorkspace initialClient={client} dbConfigured={isDbConfigured()} initialTab={initialTab} />
          </Suspense>
        </div>
      </div>
    </ClientProfileGate>
  );
}
