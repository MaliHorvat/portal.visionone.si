"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export function LoginThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="vo-btn-ghost p-2"
      title={resolved === "dark" ? "Svetla tema" : "Temna tema"}
      aria-label="Preklopi temo"
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
