import type { ContextMenuItem } from "@/components/portal/PortalContextMenu";
import type { ClientSummary } from "@/lib/types";

export type ClientMenuActions = {
  onOpen: () => void;
  onOpenNewTab: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onToggleMojPortal: () => void;
  onMarkOk: () => void;
  onMarkAlarm: () => void;
  onCopyContact: () => void;
  onOpenTab?: (tab: string) => void;
  isFavorite: boolean;
  dbConfigured: boolean;
  canAdmin: boolean;
  showDelete?: boolean;
};

export function buildClientContextMenuItems(
  client: ClientSummary,
  actions: ClientMenuActions,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { id: "open", label: "Odpri profil", onClick: actions.onOpen },
    { id: "open-new", label: "Odpri v novem zavihku", onClick: actions.onOpenNewTab },
    {
      id: "fav",
      label: actions.isFavorite ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene ★",
      onClick: actions.onToggleFavorite,
    },
  ];

  if (actions.canAdmin && actions.dbConfigured) {
    items.push(
      {
        id: "moj",
        label: client.mojPortalEnabled
          ? "Izklopi moj.visionone.si"
          : "Vklopi moj.visionone.si (status kamer)",
        onClick: actions.onToggleMojPortal,
      },
      { id: "ok", label: "Označi objekt OK", onClick: actions.onMarkOk },
      { id: "alarm", label: "Označi alarm", onClick: actions.onMarkAlarm },
      { id: "edit", label: "Uredi podatke", onClick: actions.onEdit },
    );
  }

  items.push({ id: "copy", label: "Kopiraj kontakt", onClick: actions.onCopyContact });

  if (actions.onOpenTab) {
    items.push(
      { id: "t-kamere", label: "Zavihek: Kamere", onClick: () => actions.onOpenTab!("kamere") },
      { id: "t-vzdr", label: "Zavihek: Vzdrževanje", onClick: () => actions.onOpenTab!("vzdrzevanje") },
      { id: "t-prev", label: "Zavihek: Preventiva", onClick: () => actions.onOpenTab!("preventiva") },
      { id: "t-care", label: "Zavihek: Care Box", onClick: () => actions.onOpenTab!("rpi") },
    );
  }

  if (actions.showDelete !== false && actions.canAdmin && actions.dbConfigured) {
    items.push({
      id: "delete",
      label: "Izbriši stranko",
      danger: true,
      onClick: actions.onDelete,
    });
  }

  return items;
}

export function copyClientContactText(client: Pick<ClientSummary, "name" | "address" | "contact" | "phone" | "email">): string {
  return [
    client.name,
    client.address && `Naslov: ${client.address}`,
    client.contact && `Kontakt: ${client.contact}`,
    client.phone && `Tel: ${client.phone}`,
    client.email && `E-pošta: ${client.email}`,
  ]
    .filter(Boolean)
    .join("\n");
}
