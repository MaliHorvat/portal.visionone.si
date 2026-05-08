import Image from "next/image";
import Link from "next/link";
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
    <div className="flex min-h-screen flex-col bg-[#f4f7fb] text-[#0c1222] lg:flex-row">
      <div className="flex w-full flex-col justify-between px-8 py-8 sm:px-12 lg:min-h-screen lg:w-[52%] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md pt-2 lg:pt-8">
          <div className="mb-8">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
              &lsaquo; Nazaj
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dobrodošli nazaj</h1>
          <p className="mt-2 text-sm text-slate-500">Prijavite se v svoj račun</p>

          <PortalLoginFlow
            showError={showError}
            configError={configError}
            clerkError={clerkError}
            lockedError={lockedError}
          />
        </div>

        <div className="mx-auto mt-10 w-full max-w-md space-y-3 pb-2 lg:pb-6">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} VisionOne Security Systems. Vse pravice pridržane.
          </p>
          <p className="text-[11px] text-slate-500">
            <Link href="/" className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">
              Nazaj na javno stran
            </Link>
          </p>
        </div>
      </div>

      <div className="relative flex min-h-[32vh] flex-1 items-center justify-center overflow-hidden bg-[#0d7a9a] lg:min-h-screen lg:w-[48%]">
        <Image src="/login-hero.png" alt="" fill priority className="object-cover object-center opacity-20" sizes="(max-width: 1024px) 100vw, 48vw" />
        <div className="relative z-[1] px-8 text-center text-white">
          <h2 className="text-3xl font-semibold leading-tight lg:text-4xl">Preobrazite svoje poslovanje</h2>
          <p className="mt-3 text-sm text-white/90 lg:text-base">
            Optimizirajte svoje procese z našo zmogljivo platformo
          </p>
        </div>
      </div>
    </div>
  );
}
