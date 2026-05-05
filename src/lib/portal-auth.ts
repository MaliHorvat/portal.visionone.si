export const PORTAL_SESSION_COOKIE = "vo_portal_session";
const PORTAL_SESSION_VALUE = "admin-authenticated";

export const DEFAULT_PORTAL_USERNAME = "admin";
export const DEFAULT_PORTAL_PASSWORD = "geslo123";

export function isPortalSessionValid(cookieValue: string | undefined) {
  return cookieValue === PORTAL_SESSION_VALUE;
}

export function getPortalSessionValue() {
  return PORTAL_SESSION_VALUE;
}
