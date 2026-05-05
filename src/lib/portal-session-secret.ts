/** Za podpis piškotka — mora biti isti na vseh instancah in vsaj 16 znakov v pravi produkciji. */
const DEV_FALLBACK_SECRET = "visionone-dev-session-secret-change-me";

function hasStrongSecret(raw: string | undefined): raw is string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length >= 16;
}

/**
 * Na Vercelu (`VERCEL=1`) je močan skrivni ključ obvezen — brez njega prijava ne more nastaviti piškotka.
 * Pri lokalnem `next start` (production brez Vercela) uporabimo začasni ključ + opozorilo v konzoli.
 */
export function getPortalSessionSecret(): string {
  const env = process.env.PORTAL_SESSION_SECRET;
  if (hasStrongSecret(env)) return env!.trim();

  const onVercel = process.env.VERCEL === "1";

  if (onVercel) {
    throw new Error(
      "Manjka ali je prekratek PORTAL_SESSION_SECRET (potrebnih je vsaj 16 znakov). V Vercelu: Project → Settings → Environment Variables.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[portal] PORTAL_SESSION_SECRET ni nastavljen ali je krajši od 16 znakov — uporabljen začasni ključ (primerno samo za lokalni `next start`). Za javni strežnik nastavite močen skrivni ključ.",
    );
  }

  return DEV_FALLBACK_SECRET;
}
