/** Kratka seja (brez »Ostani prijavljen«) — 8 ur. */
export const PORTAL_SESSION_SHORT_SEC = 60 * 60 * 8;

/**
 * Dolga seja — ~400 dni (praktična zgornja meja piškotkov v brskalnikih).
 * Uporabi se za portal in moj.visionone.si, ko je »Ostani prijavljen« vklopljen.
 */
export const PORTAL_SESSION_REMEMBER_SEC = 60 * 60 * 24 * 400;
