"use client";

import Link from "next/link";
import { usePortalRole } from "@/context/PortalRoleContext";

export function ProfileBackNav() {
  const { role } = usePortalRole();
  if (role === "client") {
    return (
      <Link href="/portal" className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
        ← Nazaj na nadzorno ploščo
      </Link>
    );
  }
  return (
    <Link href="/portal/stranke" className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
      ← Nazaj na stranke
    </Link>
  );
}
