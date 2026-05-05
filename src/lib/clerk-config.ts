export function isClerkPublishableConfigured(): boolean {
  const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof k === "string" && k.startsWith("pk_");
}
