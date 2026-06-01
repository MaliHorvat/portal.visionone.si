import { Activity, Camera, LayoutDashboard, RadioTower, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Live status kamer",
    text: "Online/offline stanje kamer, NVR in stikal na enem mestu.",
  },
  {
    icon: RadioTower,
    title: "Care Box",
    text: "24/7 monitoring na objektu — stranka ne nastavlja ničesar.",
  },
  {
    icon: LayoutDashboard,
    title: "Več objektov",
    text: "Enoten pregled vseh strank in lokacij iz ene nadzorne plošče.",
  },
  {
    icon: Activity,
    title: "Proaktivni nadzor",
    text: "Alarmi, opomniki in zahtevki — preden izpad postane kritičen.",
  },
  {
    icon: Shield,
    title: "Varna prijava",
    text: "Dvostopenjski dostop: Clerk + portalno uporabniško ime.",
  },
];

export function PortalLoginHero() {
  return (
    <section className="vo-login-hero relative hidden min-h-screen flex-1 overflow-hidden lg:flex lg:flex-col">
      <div className="vo-login-hero-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="vo-login-glow-orb pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="vo-login-glow-orb pointer-events-none absolute -left-16 bottom-1/4 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
        style={{ animationDelay: "-3s" }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-1 flex-col justify-between px-10 py-12 xl:px-14 xl:py-16">
        <div>
          <img
            src="/visionone-wordmark.png"
            alt="VisionOne"
            className="h-7 w-auto brightness-0 invert opacity-90"
          />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Operativni portal
          </p>
          <h1 className="mt-8 max-w-lg text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-[2.75rem]">
            Varnost in infrastruktura pod{" "}
            <span className="bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
              enim nadzorom
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Spremljanje videonadzora, Care Box telemetrija, servisni zahtevki in terenski obiski — zgrajeno za ekipo
            na terenu in 24/7 podporo.
          </p>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-teal-300/30 hover:bg-white/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-teal-200 transition group-hover:scale-105 group-hover:bg-white/15">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-white/45">
          Potrebujete dostop?{" "}
          <a
            href="mailto:info@visionone.si"
            className="text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            info@visionone.si
          </a>
          <span className="mx-2">·</span>
          <a
            href="https://visionone.si"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            visionone.si
          </a>
        </p>
      </div>

      <div className="vo-login-shine pointer-events-none absolute inset-0" aria-hidden />
    </section>
  );
}
