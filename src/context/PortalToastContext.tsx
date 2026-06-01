"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Variant = "ok" | "err";

type ToastItem = { id: number; message: string; variant: Variant };

type Ctx = {
  showToast: (message: string, variant?: Variant) => void;
};

const PortalToastContext = createContext<Ctx | null>(null);

export function PortalToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: Variant = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <PortalToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`vo-toast-enter vo-card-glass pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === "err"
                ? "border-red-400/40 text-red-50 dark:text-red-100"
                : "border-[var(--vo-ok)]/30 text-[var(--vo-fg)]"
            }`}
            style={
              t.variant === "err"
                ? { background: "color-mix(in srgb, #450a0a 92%, transparent)" }
                : undefined
            }
          >
            {t.variant === "err" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vo-ok)]" aria-hidden />
            )}
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </PortalToastContext.Provider>
  );
}

export function usePortalToast() {
  const v = useContext(PortalToastContext);
  if (!v) throw new Error("usePortalToast outside PortalToastProvider");
  return v;
}
