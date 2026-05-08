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
    colorPrimary: "#ffffff",
    colorBackground: "#111521",
    colorInputBackground: "#181e2e",
    colorInputText: "#f8fafc",
    colorText: "#f8fafc",
    colorTextSecondary: "#94a3b8",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    card: "border border-slate-700 bg-[#111521] shadow-lg",
    headerTitle: "text-white",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButton: "border-slate-600 bg-[#181e2e] text-white",
    socialButtonsBlockButtonText: "text-white",
    dividerLine: "bg-slate-700",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-400",
    formButtonPrimary: "bg-white text-[#0b0f19] font-bold hover:bg-slate-200",
    footerActionLink: "text-sky-300 hover:text-sky-200",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-sky-300",
    formFieldInput: "border-slate-600 bg-[#181e2e] text-white",
    otpCodeFieldInput: "border-slate-600 bg-[#181e2e] text-white",
  },
} as const;

export function PortalLoginFlow({ showError, configError, clerkError, lockedError }: Props) {
  const { user, isLoaded } = useUser();
  const accessSentRef = useRef(false);
  const clerkToastShownRef = useRef(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showAccessToast, setShowAccessToast] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user?.id || accessSentRef.current) return;
    accessSentRef.current = true;
    const key = `vo_portal_access_${user.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) {
      setRequestSent(true);
      setShowAccessToast(true);
      return;
    }
    void fetch("/api/portal-access-request", { method: "POST" }).then(async (res) => {
      await res.json().catch(() => ({}));
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(key, "1");
      }
      setRequestSent(true);
      setShowAccessToast(true);
    });
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id || clerkToastShownRef.current) return;
    clerkToastShownRef.current = true;
    setShowAccessToast(true);
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!showAccessToast) return;
    const id = window.setTimeout(() => setShowAccessToast(false), 4200);
    return () => window.clearTimeout(id);
  }, [showAccessToast]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f1421]/95 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
      {showAccessToast ? (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Prijava v Clerk uspešna. Zahteva poslana administratorju.
        </div>
      ) : null}
      <div className="mb-6 flex items-center gap-3">
        <img src="/visionone-mark.png" alt="VisionOne znak" className="h-12 w-12 rounded-lg object-contain" />
        <img src="/visionone-wordmark.png" alt="VisionOne napis" className="h-8 w-auto object-contain" />
      </div>
      <p className="mb-8 max-w-sm text-2xl font-semibold tracking-tight text-white">Dobrodošli nazaj</p>
      {clerkError ? (
        <p className="mb-4 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Najprej se prijavite z Clerk (varnostna prijava). Brez nje portalna prijava ni na voljo.
        </p>
      ) : null}

      <Show when="signed-out">
        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          Za dostop do portala se najprej prijavite z računom VisionOne (varnostna prijava preko Clerk).
        </p>
        <SignIn appearance={clerkAppearance} />
        <p className="mt-4 text-[11px] text-slate-400">
          Po prijavi bo zahteva za dostop posredovana skrbniku. Portalna prijava z uporabniškim imenom in geslom sledi v
          naslednjem koraku.
        </p>
      </Show>

      <Show when="signed-in">
        <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-4">
          <p className="text-sm leading-relaxed text-slate-200">
            {requestSent ? "Ko prejmete podatke od skrbnika, se spodaj prijavite." : "Pošiljanje zahtevka administratorju …"}
          </p>
          <SignOutButton signOutOptions={{ redirectUrl: "/portal-login" }}>
            <button
              type="button"
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Odjava (Clerk) — drug račun
            </button>
          </SignOutButton>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Portalna prijava</h2>
          <p className="mt-1 text-xs text-slate-400">Ko imate podatke od skrbnika.</p>

          <form action="/api/portal-login" method="post" className="mt-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Uporabniško ime
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Vnesite uporabniško ime"
                  className="w-full rounded-lg border border-slate-600 bg-[#181e2e] py-3 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Geslo
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Vnesite geslo"
                  className="w-full rounded-lg border border-slate-600 bg-[#181e2e] py-3 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="stay_logged_in"
                  value="1"
                  className="h-4 w-4 rounded border-slate-600 bg-[#181e2e] text-white accent-white"
                />
                Ostani prijavljen
              </label>
              <a
                href="mailto:info@visionone.si?subject=Pozabljeno%20portalno%20geslo"
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Pozabljeno geslo?
              </a>
            </div>

            {lockedError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Račun je začasno zaklenjen zaradi preveč neuspešnih prijav. Poskusite ponovno čez približno 15 minut.
              </p>
            ) : null}

            {showError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Napačno uporabniško ime ali geslo — ali račun še ni ustvarjen.
              </p>
            ) : null}

            {configError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Strežnik ne more podpisati seje. Na Vercelu dodajte{" "}
                <code className="rounded bg-black/30 px-1 text-xs">PORTAL_SESSION_SECRET</code> (vsaj 16 znakov) v
                Environment Variables. Lokalno v <code className="rounded bg-black/30 px-1 text-xs">.env.local</code>{" "}
                — glejte <code className="rounded bg-black/30 px-1 text-xs">.env.example</code>.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-white py-3.5 text-sm font-bold tracking-wide text-[#0b0f19] transition-opacity hover:bg-slate-200 active:opacity-90"
            >
              VSTOPI
            </button>
          </form>
        </div>
        <div className="mt-8 rounded-lg border border-slate-700 bg-[#151b2a] px-3 py-2 text-xs text-slate-300">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
          Status sistema: <span className="font-semibold text-red-400">Offline</span>
        </div>
      </Show>
    </div>
  );
}
