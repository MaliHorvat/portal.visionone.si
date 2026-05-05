/** Pretvori ime stranke v segment za URL (male črke, vezaji). */
export function slugifyName(name: string): string {
  const raw = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return raw || "stranka";
}
