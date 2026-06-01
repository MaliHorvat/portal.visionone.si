import { PortalLoginFlow } from "../PortalLoginFlow";
import { PortalLoginHero } from "../PortalLoginHero";

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
    <div className="vo-login-page flex min-h-screen flex-col text-[var(--vo-fg)] lg:flex-row">
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
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vo-accent)]">VisionOne portal</p>
            <p className="mt-2 text-lg font-semibold text-[var(--vo-fg)]">Varnost in infrastruktura pod enim nadzorom</p>
          </div>
          <PortalLoginFlow
            showError={showError}
            configError={configError}
            clerkError={clerkError}
            lockedError={lockedError}
          />
        </div>
      </section>

      <PortalLoginHero />
    </div>
  );
}
