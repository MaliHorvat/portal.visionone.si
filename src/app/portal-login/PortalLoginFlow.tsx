"use client";

import { Show, SignIn, SignOutButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  showError: boolean;
  configError: boolean;
  clerkError: boolean;
  lockedError: boolean;
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#0a8f8f",
    colorBackground: "transparent",
    colorInputBackground: "var(--vo-surface-2)",
    colorInputText: "var(--vo-fg)",
    colorText: "var(--vo-fg)",
    colorTextSecondary: "var(--vo-muted)",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "border-0 bg-transparent shadow-none p-0 gap-4",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-[var(--vo-border)] bg-[var(--vo-surface)] text-[var(--vo-fg)] shadow-sm hover:bg-[var(--vo-surface-2)] transition",
    socialButtonsBlockButtonText: "text-[var(--vo-fg)] font-medium",
    dividerLine: "bg-[var(--vo-border)]",
    dividerText: "text-[var(--vo-muted)] text-xs",
    formFieldLabel: "text-[var(--vo-muted)] text-xs font-semibold uppercase tracking-wide",
    formButtonPrimary: "vo-btn-primary w-full py-2.5 text-sm",
    footerActionLink: "text-[var(--vo-accent)] font-semibold hover:opacity-90",
    identityPreviewText: "text-[var(--vo-fg)]",
    identityPreviewEditButton: "text-[var(--vo-accent)]",
    formFieldInput: "vo-input w-full py-2.5 text-sm",
    otpCodeFieldInput: "vo-input",
    footer: "hidden",
  },
} as const;

function StepBadge({ step, label, state }: { step: number; label: string; state: "active" | "done" | "pending" }) {
  const stateClass =
    state === "active" ? "vo-login-step-active" : state === "done" ? "vo-login-step-done" : "vo-login-step-pending";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${stateClass}`}
      >
        {state === "done" ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : step}
      </span>
      <span
        className={`text-center text-[10px] font-semibold uppercase tracking-wide ${state === "active" ? "text-[var(--vo-accent)]" : "text-[var(--vo-muted)]"}`}
      >
        {label}
      </span>
    </div>
  );
}

export function PortalLoginFlow({ showError, configError, clerkError, lockedError }: Props) {
  const { user, isLoaded } = useUser();
  const accessSentRef = useRef(false);
  const [showNewUserNotice, setShowNewUserNotice] = useState(false);
  const [showAccessToast, setShowAccessToast] = useState(false);

  const clerkDone = isLoaded && !!user;

  useEffect(() => {
    if (!isLoaded || !user?.id || accessSentRef.current) return;
    accessSentRef.current = true;
    const key = `vo_portal_access_new_${user.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key) === "1") return;
    void fetch("/api/portal-access-request", { method: "POST" }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { isNew?: boolean };
      if (data.isNew) {
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, "1");
        setShowNewUserNotice(true);
        setShowAccessToast(true);
      }
    });
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!showAccessToast) return;
    const id = window.setTimeout(() => setShowAccessToast(false), 4200);
    return () => window.clearTimeout(id);
  }, [showAccessToast]);

  return (
    <div className="vo-login-card vo-page-enter overflow-hidden rounded-2xl border border-[var(--vo-border)]">
      <div className="h-1.5 bg-[var(--vo-accent-gradient)]" aria-hidden />

      <div className="p-6 sm:p-8">
        {showAccessToast ? (
          <div className="vo-toast-enter mb-5 flex items-start gap-3 rounded-xl border border-[var(--vo-ok)]/30 bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Prijava v Clerk uspešna. Zahteva poslana administratorju.</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] ring-1 ring-[var(--vo-accent)]/25">
            <img src="/visionone-mark.png" alt="" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="vo-eyebrow flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              VisionOne portal
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--vo-fg)]">
              Vstop v <span className="vo-page-title-gradient">operativni portal</span>
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[var(--vo-muted)]">
          Dobrodošli. Prijavite se v dveh korakih — najprej varnostno preverjanje, nato portalni dostop.
        </p>

        <div className="mt-6 flex gap-2">
          <StepBadge step={1} label="Varnost" state={clerkDone ? "done" : "active"} />
          <div className="mt-4 h-px flex-1 self-start bg-[var(--vo-border)]" aria-hidden />
          <StepBadge step={2} label="Portal" state={clerkDone ? "active" : "pending"} />
        </div>

        {clerkError ? (
          <p className="vo-login-alert-warn mt-5">Najprej dokončajte varnostno prijavo (Clerk). Brez nje portalni dostop ni na voljo.</p>
        ) : null}

        <Show when="signed-out">
          <div className="vo-card mt-6 border-[var(--vo-border)] bg-[var(--vo-surface-2)]/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />
              <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Korak 1 — Varnostna prijava</h2>
            </div>
            <SignIn appearance={clerkAppearance} />
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--vo-muted)]">
              Po prijavi bo zahteva posredovana skrbniku. Portalna prijava z uporabniškim imenom in geslom sledi v
              koraku 2.
            </p>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--vo-ok)]/25 bg-[var(--vo-ok-muted)] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[var(--vo-ok)]">
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                <span className="font-medium">Varnostna prijava OK</span>
              </div>
              <SignOutButton signOutOptions={{ redirectUrl: "/portal-login" }}>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--vo-muted)] underline-offset-2 hover:text-[var(--vo-fg)] hover:underline"
                >
                  Drug račun
                </button>
              </SignOutButton>
            </div>

            {showNewUserNotice ? (
              <p className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm text-[var(--vo-fg)]">
                Ko prejmete podatke od skrbnika, vnesite jih spodaj.
              </p>
            ) : null}

            <div className="vo-card p-5">
              <div className="mb-5 flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />
                <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Korak 2 — Portalna prijava</h2>
              </div>

              <form action="/api/portal-login" method="post" className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="vo-section-label">
                    Uporabniško ime
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]"
                      aria-hidden
                    />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="npr. uporabnik"
                      className="vo-input w-full py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="vo-section-label">
                    Geslo
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]"
                      aria-hidden
                    />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="vo-input w-full py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[var(--vo-muted)]">
                    <input
                      type="checkbox"
                      name="stay_logged_in"
                      value="1"
                      className="h-4 w-4 rounded border-[var(--vo-border)] accent-[var(--vo-accent)]"
                    />
                    Ostani prijavljen
                  </label>
                  <a
                    href="mailto:info@visionone.si?subject=Pozabljeno%20portalno%20geslo"
                    className="text-xs font-medium text-[var(--vo-accent)] hover:underline"
                  >
                    Pozabljeno geslo?
                  </a>
                </div>

                {lockedError ? (
                  <p className="vo-login-alert-error">Račun je začasno zaklenjen. Poskusite ponovno čez približno 15 minut.</p>
                ) : null}

                {showError ? (
                  <p className="vo-login-alert-error">
                    Napačno uporabniško ime ali geslo — ali račun še ni ustvarjen.
                  </p>
                ) : null}

                {configError ? (
                  <p className="vo-login-alert-error">
                    Strežnik ne more podpisati seje. Na Vercelu nastavite{" "}
                    <code className="rounded bg-[var(--vo-danger-muted)] px-1 text-xs">PORTAL_SESSION_SECRET</code> (vsaj
                    16 znakov).
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="vo-btn-primary group flex w-full items-center justify-center gap-2 py-3.5 text-sm tracking-wide"
                >
                  Vstopi v portal
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </button>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
