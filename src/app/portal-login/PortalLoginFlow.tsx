"use client";

import { Show, SignIn, SignOutButton, useUser } from "@clerk/nextjs";
import { Lock, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  showError: boolean;
  configError: boolean;
  clerkError: boolean;
  lockedError: boolean;
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#0d7a7a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#0c1222",
    colorText: "#0c1222",
    colorTextSecondary: "#5c6578",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    card: "border border-slate-200 bg-white shadow-md",
    headerTitle: "text-slate-900",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButton: "border-slate-200 bg-white text-slate-900",
    socialButtonsBlockButtonText: "text-slate-900",
    dividerLine: "bg-slate-200",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-600",
    formButtonPrimary: "bg-[#0d7a7a] text-white font-bold hover:bg-[#0a6363]",
    footerActionLink: "text-[#0d7a7a] hover:text-[#0a6363]",
    identityPreviewText: "text-slate-900",
    identityPreviewEditButton: "text-[#0d7a7a]",
    formFieldInput: "border-slate-300 bg-white text-slate-900",
    otpCodeFieldInput: "border-slate-300 bg-white text-slate-900",
  },
} as const;

export function PortalLoginFlow({ showError, configError, clerkError, lockedError }: Props) {
  const { user, isLoaded } = useUser();
  const accessSentRef = useRef(false);
  const [showNewUserNotice, setShowNewUserNotice] = useState(false);
  const [showAccessToast, setShowAccessToast] = useState(false);

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
    <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)] sm:p-8">
      {showAccessToast ? (
        <div className="mb-4 rounded-lg border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-3 py-2 text-sm text-[var(--vo-ok)]">
          Prijava v Clerk uspešna. Zahteva poslana administratorju.
        </div>
      ) : null}
      <div className="mb-6 flex items-center gap-3">
        <img src="/visionone-mark.png" alt="VisionOne znak" className="h-12 w-12 rounded-lg object-contain" />
        <img src="/visionone-wordmark.png" alt="VisionOne napis" className="h-8 w-auto object-contain" />
      </div>
      <p className="mb-8 max-w-sm text-2xl font-semibold tracking-tight text-[var(--vo-fg)]">Dobrodošli nazaj</p>
      {clerkError ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Najprej se prijavite z Clerk (varnostna prijava). Brez nje portalna prijava ni na voljo.
        </p>
      ) : null}

      <Show when="signed-out">
        <p className="mb-4 text-sm leading-relaxed text-[var(--vo-muted)]">
          Za dostop do portala se najprej prijavite z računom VisionOne (varnostna prijava preko Clerk).
        </p>
        <SignIn appearance={clerkAppearance} />
        <p className="mt-4 text-[11px] text-[var(--vo-muted)]">
          Po prijavi bo zahteva za dostop posredovana skrbniku. Portalna prijava z uporabniškim imenom in geslom sledi v
          naslednjem koraku.
        </p>
      </Show>

      <Show when="signed-in">
        <div className="space-y-6 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-4">
          {showNewUserNotice ? (
            <p className="text-sm leading-relaxed text-[var(--vo-fg)]">
              Ko prejmete podatke od skrbnika, se spodaj prijavite.
            </p>
          ) : null}
          <SignOutButton signOutOptions={{ redirectUrl: "/portal-login" }}>
            <button
              type="button"
              className="text-xs font-medium text-[var(--vo-muted)] underline-offset-2 hover:text-[var(--vo-fg)] hover:underline"
            >
              Odjava (Clerk) — drug račun
            </button>
          </SignOutButton>
        </div>

        <div className="mt-8 border-t border-[var(--vo-border)] pt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vo-muted)]">Portalna prijava</h2>
          <p className="mt-1 text-xs text-[var(--vo-muted)]">Ko imate podatke od skrbnika.</p>

          <form action="/api/portal-login" method="post" className="mt-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vo-muted)]">
                Uporabniško ime
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" aria-hidden />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Vnesite uporabniško ime"
                  className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-3 pl-10 pr-3 text-sm text-[var(--vo-fg)] outline-none ring-0 placeholder:text-[var(--vo-muted)] focus:border-[var(--vo-accent)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vo-muted)]">
                Geslo
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" aria-hidden />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Vnesite geslo"
                  className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-3 pl-10 pr-3 text-sm text-[var(--vo-fg)] outline-none ring-0 placeholder:text-[var(--vo-muted)] focus:border-[var(--vo-accent)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[var(--vo-muted)]">
                <input
                  type="checkbox"
                  name="stay_logged_in"
                  value="1"
                  className="h-4 w-4 rounded border-[var(--vo-border)] bg-[var(--vo-surface)] text-[var(--vo-accent)] accent-[var(--vo-accent)]"
                />
                Ostani prijavljen
              </label>
              <a
                href="mailto:info@visionone.si?subject=Pozabljeno%20portalno%20geslo"
                className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
              >
                Pozabljeno geslo?
              </a>
            </div>

            {lockedError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Račun je začasno zaklenjen zaradi preveč neuspešnih prijav. Poskusite ponovno čez približno 15 minut.
              </p>
            ) : null}

            {showError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Napačno uporabniško ime ali geslo — ali račun še ni ustvarjen.
              </p>
            ) : null}

            {configError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Strežnik ne more podpisati seje. Na Vercelu dodajte{" "}
                <code className="rounded bg-black/30 px-1 text-xs">PORTAL_SESSION_SECRET</code> (vsaj 16 znakov) v
                Environment Variables. Lokalno v <code className="rounded bg-black/30 px-1 text-xs">.env.local</code>{" "}
                — glejte <code className="rounded bg-black/30 px-1 text-xs">.env.example</code>.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--vo-accent)] py-3.5 text-sm font-bold tracking-wide text-white transition-opacity hover:bg-[var(--vo-accent-hover)] active:opacity-90"
            >
              VSTOPI
            </button>
          </form>
        </div>
      </Show>
    </div>
  );
}
