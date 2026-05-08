import Image from "next/image";
import { PortalLoginFlow } from "../PortalLoginFlow";

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
    <div className="flex min-h-screen flex-col bg-[var(--vo-bg)] text-[var(--vo-fg)] lg:flex-row">
      <section className="flex w-full items-center justify-center px-6 py-8 sm:px-10 lg:w-[48%] lg:px-14 xl:px-16">
        <div className="w-full max-w-md">
          <PortalLoginFlow
            showError={showError}
            configError={configError}
            clerkError={clerkError}
            lockedError={lockedError}
          />
        </div>
      </section>

      <section className="relative hidden min-h-screen flex-1 lg:flex">
        <Image src="/login-hero-cameras.png" alt="" fill priority className="object-cover object-center" sizes="52vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d7a7a]/65 via-[#0d7a7a]/40 to-[#0d7a7a]/20" />
        <div className="relative z-[1] mt-auto max-w-xl px-10 pb-16 xl:px-16 xl:pb-20">
          <h2 className="text-5xl font-bold leading-[1.02] tracking-tight text-white">Napredno načrtovanje varnosti.</h2>
          <p className="mt-6 text-2xl leading-relaxed text-white/90">
            Vizualizacija pokritosti kamer, izračun pasovne širine in generiranje dokumentacije v enem samem orodju.
          </p>
        </div>
      </section>
    </div>
  );
}
