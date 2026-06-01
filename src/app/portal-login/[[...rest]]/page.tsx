import { PortalLoginFlow } from "../PortalLoginFlow";
import { PortalLoginHero } from "../PortalLoginHero";
import { LoginThemeToggle } from "../LoginThemeToggle";

type PortalLoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
  const params = await searchParams;
  const showError = params?.error === "1";
  const configError = params?.error === "config";
  const clerkError = params?.error === "clerk";
  const lockedError = params?.error === "locked";

  return (
    <div className="vo-login-page relative flex min-h-screen flex-col text-[var(--vo-fg)] lg:flex-row">
      <div className="vo-login-topbar lg:left-auto lg:right-[calc(50%+1rem)]">
        <LoginThemeToggle />
      </div>

      <section className="relative flex w-full flex-col justify-center px-5 py-10 sm:px-8 lg:w-[min(100%,520px)] lg:shrink-0 lg:px-10 xl:w-[540px] xl:px-12">
        <div
          className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-[var(--vo-accent)]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-32 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl lg:hidden"
          aria-hidden
        />

        <div className="relative z-[1] mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] ring-1 ring-[var(--vo-accent)]/20">
              <img src="/visionone-mark.png" alt="" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--vo-accent)]">VisionOne</p>
              <p className="text-lg font-semibold text-[var(--vo-fg)]">Portal</p>
            </div>
          </div>
          <PortalLoginFlow
            showError={showError}
            configError={configError}
            clerkError={clerkError}
            lockedError={lockedError}
          />
          <p className="vo-login-footer">
            <a href="https://visionone.si" target="_blank" rel="noopener noreferrer">
              Nazaj na visionone.si
            </a>
          </p>
        </div>
      </section>

      <PortalLoginHero />
    </div>
  );
}
