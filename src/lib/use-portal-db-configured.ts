"use client";

import { useEffect, useState } from "react";

let cachedDbConfigured: boolean | null = null;

/** Enkrat preveri /api/health in shrani ali je DATABASE_URL nastavljen. */
export function usePortalDbConfigured(): boolean {
  const [dbConfigured, setDbConfigured] = useState(cachedDbConfigured ?? true);

  useEffect(() => {
    if (cachedDbConfigured !== null) {
      setDbConfigured(cachedDbConfigured);
      return;
    }
    void fetch("/api/health")
      .then((r) => r.json())
      .then((j: { checks?: { dbConfigured?: boolean } }) => {
        cachedDbConfigured = Boolean(j.checks?.dbConfigured);
        setDbConfigured(cachedDbConfigured);
      })
      .catch(() => {
        cachedDbConfigured = false;
        setDbConfigured(false);
      });
  }, []);

  return dbConfigured;
}
