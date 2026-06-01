"use client";

import { ClientPreventivePanel } from "@/components/portal/ClientPreventivePanel";
import type { WorkspaceCtx } from "./types";

export function TabPreventiva({ ctx }: { ctx: WorkspaceCtx }) {
  return <ClientPreventivePanel ctx={ctx} />;
}
