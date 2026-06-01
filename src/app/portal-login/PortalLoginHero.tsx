import { Activity, Camera, LayoutDashboard, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Live status kamer",
    text: "Online/offline stanje kamer, NVR in stikal na enem mestu.",
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
        className="vo-login-glow-orb pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="vo-login-glow-orb pointer-events-none absolute -left-16 bottom-1/4 h-56 w-56 rounded-full bg-teal-300/15 blur-3xl"
        style={{ animationDelay: "-3s" }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-1 flex-col justify-between px-10 py-12 xl:px-14 xl:py-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            VisionOne operativni portal
          </p>
          <h1 className="mt-8 max-w-lg text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-[2.75rem]">
            Varnost in infrastruktura pod{" "}
            <span className="bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
              enim nadzorom
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Portal za spremljanje videonadzora, telemetrijo z lokacije in servisne procese — zgrajen za teren in
            24/7 podporo.
          </p>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-teal-200 transition group-hover:bg-white/15">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-white/45">
          Potrebujete dostop?{" "}
          <a href="mailto:info@visionone.si" className="text-white/70 underline-offset-2 hover:text-white hover:underline">
            info@visionone.si
          </a>
        </p>
      </div>

      <div className="vo-login-shine pointer-events-none absolute inset-0" aria-hidden />
    </section>
  );
}
