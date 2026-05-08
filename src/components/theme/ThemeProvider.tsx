"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

type Theme = "light" | "dark" | "system";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme: Theme = "light";
  const resolved: "light" | "dark" = "light";

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  const setTheme: Ctx["setTheme"] = useCallback(() => undefined, []);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme outside ThemeProvider");
  return v;
}
