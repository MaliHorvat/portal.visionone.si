import type { ClientDetail } from "@/lib/types";

export type WorkspaceTab =
  | "kamere"
  | "oprema"
  | "shema"
  | "rack"
  | "ponudbe"
  | "popisi"
  | "cas"
  | "vzdrzevanje";

export type WorkspaceCtx = {
  clientId: string;
  client: ClientDetail;
  dbConfigured: boolean;
  reload: () => Promise<void>;
};
