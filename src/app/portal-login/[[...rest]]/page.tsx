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
      <div className="pointer-events-none absolute inset-0 vo-mesh-bg" aria-hidden />
      <div className="vo-login-topbar">
        <LoginThemeToggle />
      </div>

      <section className="relative flex w-full flex-col justify-center px-5 py-10 sm:px-8 lg:w-[min(100%,520px)] lg:shrink-0 lg:px-10 xl:w-[540px] xl:px-12">
        <div className="relative z-[1] mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/visionone-mark.png" alt="VisionOne" className="h-10 w-10 shrink-0 rounded object-contain" />
            <img src="/visionone-wordmark.png" alt="VisionOne" className="h-7 w-auto object-contain object-left" />
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
