import type { ClientDetail } from "@/lib/types";

export type WorkspaceTab =
  | "kamere"
  | "oprema"
  | "shema"
  | "rack"
  | "ponudbe"
  | "popisi"
  | "cas"
  | "vzdrzevanje"
  | "dokumenti";

const WORKSPACE_TAB_IDS = new Set<WorkspaceTab>([
  "kamere",
  "oprema",
  "shema",
  "rack",
  "ponudbe",
  "popisi",
  "cas",
  "vzdrzevanje",
  "dokumenti",
]);

export type WorkspaceCtx = {
  clientId: string;
  client: ClientDetail;
  dbConfigured: boolean;
  reload: () => Promise<void>;
  applyClient: (next: ClientDetail) => void;
};

export function parseWorkspaceTab(raw: string | null | undefined): WorkspaceTab {
  return raw && WORKSPACE_TAB_IDS.has(raw as WorkspaceTab) ? (raw as WorkspaceTab) : "kamere";
}
