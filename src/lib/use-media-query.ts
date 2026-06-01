"use client";

import { useEffect, useState } from "react";

/** Ujame breakpoint; privzeto false do mount (izogibanje hydration mismatch na SSR). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 639px)");
}

export function useIsCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
