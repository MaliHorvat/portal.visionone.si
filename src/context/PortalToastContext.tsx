"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

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
    }, 3800);
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
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === "err"
                ? "border-red-400/50 bg-red-950/95 text-red-50"
                : "border-[var(--vo-ok)]/40 bg-[var(--vo-surface)] text-[var(--vo-fg)] ring-1 ring-[var(--vo-ok)]/25"
            }`}
          >
            {t.variant === "ok" ? (
              <span className="mr-2 inline-block text-[var(--vo-ok)]">✓</span>
            ) : null}
            {t.message}
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
