"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-0.5 ${className}`}
      role="group"
      aria-label="Tema"
    >
      {(
        [
          ["light", Sun],
          ["system", Monitor],
          ["dark", Moon],
        ] as const
      ).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          className={`rounded-md p-2 transition ${
            theme === key
              ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
              : "text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
          }`}
          aria-pressed={theme === key}
          title={key === "light" ? "Svetla" : key === "dark" ? "Temna" : "Sistem"}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
