"use client";

// import { Show, SignIn, SignOutButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Lock, Sparkles, User } from "lucide-react";
import { VisionOneLogo } from "@/components/brand/VisionOneLogo";

type Props = {
  showError: boolean;
  configError: boolean;
  clerkError: boolean;
  lockedError: boolean;
  appMoj?: boolean;
};

export function PortalLoginFlow({ showError, configError, clerkError, lockedError, appMoj }: Props) {
  return (
    <div className="vo-login-card vo-page-enter overflow-hidden rounded-2xl border border-[var(--vo-border)]">
      <div className="h-1.5 bg-[var(--vo-accent-gradient)]" aria-hidden />

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] ring-1 ring-[var(--vo-accent)]/25">
            <VisionOneLogo variant="mark" markClassName="h-9 w-9 object-contain" />
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
          Clerk je začasno izklopljen. Prijava poteka neposredno s portalnim uporabniškim imenom in geslom.
        </p>

        {clerkError ? <p className="vo-login-alert-warn mt-5">Clerk je trenutno izklopljen.</p> : null}

        {/*
          Clerk login flow je ohranjen v git zgodovini in ga lahko kadarkoli vrnemo:
          - useUser(), Show, SignIn, SignOutButton
          - /api/portal-access-request
          - dvokoračni prikaz (Varnost -> Portal)
        */}

        <div className="mt-6 space-y-4">
          <div className="vo-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />
              <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Portalna prijava</h2>
            </div>

            <form action="/api/portal-login" method="post" className="space-y-5">
              {appMoj ? <input type="hidden" name="app" value="moj" /> : null}
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
                    defaultChecked
                    className="h-4 w-4 rounded border-[var(--vo-border)] accent-[var(--vo-accent)]"
                  />
                  Ostani prijavljen (priporočeno)
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
                <p className="vo-login-alert-error">Napačno uporabniško ime ali geslo — ali račun še ni ustvarjen.</p>
              ) : null}

              {configError ? (
                <p className="vo-login-alert-error">
                  Strežnik ne more podpisati seje. Na Vercelu nastavite{" "}
                  <code className="rounded bg-[var(--vo-danger-muted)] px-1 text-xs">PORTAL_SESSION_SECRET</code> (vsaj 16 znakov).
                </p>
              ) : null}

              <button
                type="submit"
                className="vo-btn-primary group flex w-full items-center justify-center gap-2 py-3.5 text-sm tracking-wide"
              >
                {appMoj ? "Vstopi — Moj VisionOne" : "Vstopi v portal"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
