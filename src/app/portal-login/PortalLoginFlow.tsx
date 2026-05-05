"use client";

import { Show, SignIn, SignOutButton, useUser } from "@clerk/nextjs";
import { Lock, User } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  showError: boolean;
  configError: boolean;
  clerkError: boolean;
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#141414",
    colorInputBackground: "#1a1a1a",
    colorInputText: "#fafafa",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    card: "border border-zinc-700 bg-[#141414] shadow-xl",
    headerTitle: "text-white",
    headerSubtitle: "text-zinc-400",
    socialButtonsBlockButton: "border-zinc-600 bg-[#1a1a1a] text-white",
    socialButtonsBlockButtonText: "text-white",
    dividerLine: "bg-zinc-700",
    dividerText: "text-zinc-500",
    formFieldLabel: "text-zinc-400",
    formButtonPrimary: "bg-white text-black font-bold hover:bg-zinc-200",
    footerActionLink: "text-teal-400 hover:text-teal-300",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-teal-400",
    formFieldInput: "border-zinc-600 bg-[#1a1a1a] text-white",
    otpCodeFieldInput: "border-zinc-600 bg-[#1a1a1a] text-white",
  },
} as const;

export function PortalLoginFlow({ showError, configError, clerkError }: Props) {
  const { user, isLoaded } = useUser();
  const accessSentRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user?.id || accessSentRef.current) return;
    accessSentRef.current = true;
    const key = `vo_portal_access_${user.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    void fetch("/api/portal-access-request", { method: "POST" }).then(() => {
      sessionStorage.setItem(key, "1");
    });
  }, [isLoaded, user?.id]);

  return (
    <div className="mt-10">
      {clerkError ? (
        <p className="mb-4 rounded-lg border border-amber-500/35 bg-amber-950/80 px-3 py-2 text-sm text-amber-50">
          Najprej se prijavite z Clerk (varnostna prijava). Brez nje portalna prijava ni na voljo.
        </p>
      ) : null}

      <Show when="signed-out">
        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          Za dostop do portala se najprej prijavite z računom VisionOne (varnostna prijava preko Clerk).
        </p>
        <SignIn appearance={clerkAppearance} />
        <p className="mt-4 text-[11px] text-zinc-600">
          Po prijavi bo zahteva za dostop posredovana skrbniku. Portalna prijava z uporabniškim imenom in geslom sledi v
          naslednjem koraku.
        </p>
      </Show>

      <Show when="signed-in">
        <div className="space-y-6 rounded-xl border border-teal-800/40 bg-teal-950/25 px-4 py-4">
          <p className="text-sm leading-relaxed text-teal-50/95">
            <span className="font-semibold text-teal-200">Zahteva za uporabo portala je posredovana.</span> Obvestilo je
            poslano na{" "}
            <a href="mailto:info@visionone.si" className="font-medium text-teal-300 underline underline-offset-2">
              info@visionone.si
            </a>
            . Ko vam skrbnik ročno ustvari portalni račun, se spodaj prijavite z uporabniškim imenom in geslom.
          </p>
          <SignOutButton signOutOptions={{ redirectUrl: "/portal-login" }}>
            <button
              type="button"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Odjava (Clerk) — drug račun
            </button>
          </SignOutButton>
        </div>

        <div className="mt-8 border-t border-zinc-800 pt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Portalna prijava</h2>
          <p className="mt-1 text-xs text-zinc-600">Ko imate podatke od skrbnika.</p>

          <form action="/api/portal-login" method="post" className="mt-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Uporabniško ime
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Vnesite uporabniško ime"
                  className="w-full rounded-lg border border-zinc-700 bg-[#1a1a1a] py-3 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Geslo
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Vnesite geslo"
                  className="w-full rounded-lg border border-zinc-700 bg-[#1a1a1a] py-3 pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  name="stay_logged_in"
                  value="1"
                  className="h-4 w-4 rounded border-zinc-600 bg-[#1a1a1a] text-white accent-white"
                />
                Ostani prijavljen
              </label>
              <a
                href="mailto:info@visionone.si?subject=Pozabljeno%20portalno%20geslo"
                className="text-xs text-zinc-500 hover:text-zinc-400"
              >
                Pozabljeno geslo?
              </a>
            </div>

            {showError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/80 px-3 py-2 text-sm text-red-100">
                Napačno uporabniško ime ali geslo — ali račun še ni ustvarjen.
              </p>
            ) : null}

            {configError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/80 px-3 py-2 text-sm text-red-100">
                Strežnik ne more podpisati seje. Na Vercelu dodajte{" "}
                <code className="rounded bg-black/30 px-1 text-xs">PORTAL_SESSION_SECRET</code> (vsaj 16 znakov) v
                Environment Variables. Lokalno v <code className="rounded bg-black/30 px-1 text-xs">.env.local</code>{" "}
                — glejte <code className="rounded bg-black/30 px-1 text-xs">.env.example</code>.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-white py-3.5 text-sm font-bold tracking-wide text-black transition-opacity hover:opacity-95 active:opacity-90"
            >
              VSTOPI
            </button>
          </form>
        </div>
      </Show>
    </div>
  );
}
