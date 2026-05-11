"use client";

/** Dostop do profila stranke uveljavlja strežnik (`getClientForSession`); tukaj ni dodatnega mock filtra. */
export function ClientProfileGate({
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
