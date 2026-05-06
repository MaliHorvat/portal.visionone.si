import { NastavitvePortalPassword } from "../nastavitve/NastavitvePortalPassword";

type PortalRacunPageProps = {
  searchParams?: Promise<{ force_password?: string }>;
};

export default async function PortalRacunPage({ searchParams }: PortalRacunPageProps) {
  const params = await searchParams;
  const forcePassword = params?.force_password === "1";
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Moj račun</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--vo-muted)]">
          Portalna prijava (uporabniško ime in geslo) je ločena od varnostne prijave Clerk. Spodaj lahko spremenite
          geslo za dostop do portala.
        </p>
        {forcePassword ? (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Zaradi varnosti morate ob prvi prijavi zamenjati začasno geslo.
          </p>
        ) : null}
      </div>
      <NastavitvePortalPassword />
    </div>
  );
}
