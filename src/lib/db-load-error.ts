/** Kratek, varen povzetek napake pri branju iz baze (za UI). */
export function formatDbLoadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const hint =
    "Zaženite posodobitev sheme proti istemu DATABASE_URL kot na Vercelu (npr. npm run db:push). Podrobnosti: Vercel → Logs.";

  if (/P1001|Can't reach database|ECONNREFUSED|ETIMEDOUT|connect/i.test(raw)) {
    return `Povezava z bazo ni uspela (strežnik nedosegljiv ali požarni zid). Preverite DATABASE_URL na Vercelu in dostop MySQL za oddaljene IP-je. ${hint}`;
  }
  if (/P2021|P2022|does not exist|Unknown column|no such table/i.test(raw)) {
    return `Shema baze ne ustreza tej različici aplikacije. ${hint}`;
  }
  if (/Unexpected end of JSON|JSON input|not valid JSON/i.test(raw)) {
    return `Podatki v bazi imajo neveljaven JSON (npr. stolpec tags). Zaženite npm run db:fix-json proti produkcijski bazi ali ponovno deployajte (build vključuje sanacijo). ${hint} Prikazani so začasni demo podatki.`;
  }
  if (/query_engine|wasm|PrismaClient/i.test(raw)) {
    return `Prisma odjemalec ni pravilno nameščen. Na Vercelu ponovno deployajte po usklajenih različicah prisma in @prisma/client (npm install). ${hint}`;
  }

  const short = raw.replace(/\s+/g, " ").slice(0, 200);
  return `Podatkov iz baze ni bilo mogoče naložiti${short ? ` (${short})` : ""}. ${hint} Prikazani so začasni demo podatki.`;
}
