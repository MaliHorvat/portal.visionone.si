export function getPortalSessionSecret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PORTAL_SESSION_SECRET mora biti nastavljen v produkciji (vsaj 16 znakov).");
  }
  return "visionone-dev-session-secret-change-me";
}
