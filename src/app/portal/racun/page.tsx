import { NastavitvePortalPassword } from "../nastavitve/NastavitvePortalPassword";

export default function PortalRacunPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Moj račun</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--vo-muted)]">
          Portalna prijava (uporabniško ime in geslo) je ločena od varnostne prijave Clerk. Spodaj lahko spremenite
          geslo za dostop do portala.
        </p>
      </div>
      <NastavitvePortalPassword />
    </div>
  );
}
