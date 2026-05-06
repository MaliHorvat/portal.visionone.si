export type PortalUserRole = "admin" | "operator" | "viewer";

export function roleLabel(role: PortalUserRole): string {
  if (role === "admin") return "Administrator";
  if (role === "operator") return "Operater";
  return "Pregled";
}

export function isAdminRole(role: PortalUserRole): boolean {
  return role === "admin";
}
