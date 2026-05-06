import Image from "next/image";
import Link from "next/link";
import { Shield } from "lucide-react";
import { PortalLoginFlow } from "../PortalLoginFlow";

type PortalLoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

function ShieldLogo() {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
      <Shield className="h-8 w-8 text-white" strokeWidth={1.25} aria-hidden />
      <span className="pointer-events-none absolute text-[12px] font-black leading-none text-neutral-900">V</span>
    </div>
  );
}

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
  const params = await searchParams;
  const showError = params?.error === "1";
  const configError = params?.error === "config";
  const clerkError = params?.error === "clerk";
  const lockedError = params?.error === "locked";

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white lg:flex-row">
      <div className="flex w-full flex-col justify-between px-8 py-10 sm:px-12 lg:max-w-md lg:min-h-screen lg:shrink-0 xl:max-w-lg">
        <div>
          <div className="flex items-start gap-3">
            <ShieldLogo />
            <div>
              <span className="text-xl font-bold tracking-tight">VisionOne</span>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
                Profesionalna platforma za načrtovanje in upravljanje videonadzornih sistemov.
              </p>
            </div>
          </div>

          <PortalLoginFlow
            showError={showError}
            configError={configError}
            clerkError={clerkError}
            lockedError={lockedError}
          />
        </div>

        <div className="mt-12 space-y-4 lg:mt-8">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Status sistema: Online
          </div>
          <p className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} VisionOne Security Systems. Vse pravice pridržane.
          </p>
          <p className="text-[11px] text-zinc-600">
            <Link href="/" className="text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline">
              Nazaj na javno stran
            </Link>
          </p>
        </div>
      </div>

      <div className="relative flex min-h-[42vh] flex-1 flex-col justify-end lg:min-h-screen">
        <Image
          src="/login-hero.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 66vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 lg:bg-gradient-to-r lg:from-black/90 lg:via-black/35 lg:to-transparent" />
        <div className="relative z-[1] p-8 pb-12 lg:p-14 lg:pb-16">
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md lg:text-4xl">
            Napredno načrtovanje varnosti.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/90 drop-shadow-md lg:text-base">
            Vizualizacija pokritosti kamer, izračun pasovne širine in generiranje dokumentacije v enem samem orodju.
          </p>
        </div>
      </div>
    </div>
  );
}
