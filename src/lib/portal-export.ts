export function downloadCsv(filename: string, rows: string[][]): void {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const body = "\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClientsCsv(
  clients: Array<{
    name: string;
    address?: string;
    contact?: string;
    phone?: string;
    email?: string;
    package?: string;
    health?: string;
    tags?: string;
  }>,
): void {
  downloadCsv("visionone-stranke.csv", [
    ["Ime", "Naslov", "Kontakt", "Telefon", "E-pošta", "Paket", "Zdravje", "Oznake"],
    ...clients.map((c) => [
      c.name,
      c.address ?? "",
      c.contact ?? "",
      c.phone ?? "",
      c.email ?? "",
      c.package ?? "",
      c.health ?? "",
      c.tags ?? "",
    ]),
  ]);
}

export function exportRemindersCsv(
  rows: Array<{ title: string; clientName: string; dueDate: string; completed?: boolean }>,
): void {
  downloadCsv("visionone-opomniki.csv", [
    ["Naslov", "Stranka", "Rok", "Zaključeno"],
    ...rows.map((r) => [r.title, r.clientName, r.dueDate, r.completed ? "da" : "ne"]),
  ]);
}

export function exportServiceRequestsCsv(
  rows: Array<{
    title: string;
    clientName: string;
    status: string;
    priority: string;
    dueDate: string;
  }>,
): void {
  downloadCsv("visionone-zahtevki.csv", [
    ["Naslov", "Stranka", "Status", "Prioriteta", "Rok"],
    ...rows.map((r) => [r.title, r.clientName, r.status, r.priority, r.dueDate]),
  ]);
}

export function exportNotesCsv(
  rows: Array<{ title: string; content: string }>,
): void {
  downloadCsv("visionone-belezke.csv", [
    ["Naslov", "Vsebina"],
    ...rows.map((r) => [r.title, r.content.replace(/\r?\n/g, " ")]),
  ]);
}

export function exportAuditCsv(
  rows: Array<{ createdAt: string; username: string; action: string; details: string }>,
): void {
  downloadCsv("visionone-audit.csv", [
    ["Čas", "Uporabnik", "Akcija", "Podrobnosti"],
    ...rows.map((r) => [r.createdAt, r.username, r.action, r.details]),
  ]);
}

export function exportOfferLinesCsv(
  rows: Array<{
    code: string;
    description: string;
    qty: number;
    unitPrice: number;
    discountPct: number;
  }>,
): void {
  downloadCsv("visionone-ponudba.csv", [
    ["Koda", "Opis", "Količina", "Cena", "Popust %", "Neto"],
    ...rows.map((l) => {
      const net = l.qty * l.unitPrice * (1 - l.discountPct / 100);
      return [
        l.code,
        l.description,
        String(l.qty),
        String(l.unitPrice),
        String(l.discountPct),
        net.toFixed(2),
      ];
    }),
  ]);
}

export function exportTimeLogsCsv(
  rows: Array<{ projectName: string; date: string; hours: number; note: string }>,
): void {
  downloadCsv("visionone-cas.csv", [
    ["Projekt", "Datum", "Ure", "Opomba"],
    ...rows.map((r) => [r.projectName, r.date, String(r.hours), r.note]),
  ]);
}

export function exportDashboardCsv(payload: {
  clients: Array<{ name: string; state: string; camerasOnline: number; camerasTotal: number }>;
  totals: Record<string, number>;
}): void {
  downloadCsv("visionone-pregled.csv", [
    ["Metrika", "Vrednost"],
    ["Stranke", String(payload.totals.clients ?? 0)],
    ["Kamere online", String(payload.totals.camerasOnline ?? 0)],
    ["Kamere offline", String(payload.totals.camerasOffline ?? 0)],
    ["Zahtevki odprti", String(payload.totals.requestsOpen ?? 0)],
    [],
    ["Stranka", "Stanje", "Kamere"],
    ...payload.clients.map((c) => [
      c.name,
      c.state,
      `${c.camerasOnline}/${c.camerasTotal}`,
    ]),
  ]);
}
