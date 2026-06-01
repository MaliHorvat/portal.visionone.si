import type { MarketingImageConfig, MarketingSiteContent } from "./types";

function img(
  key: string,
  label: string,
  src: string,
  alt = "",
  extra?: Partial<MarketingImageConfig>,
): MarketingImageConfig {
  return { key, label, src, alt, objectFit: "cover", objectPosition: "center", ...extra };
}

export const DEFAULT_MARKETING_SITE_CONTENT: MarketingSiteContent = {
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  images: {
    MARKETING_IMG_HERO: img("MARKETING_IMG_HERO", "Domov — hero ozadje", "12.png", "", {
      objectPosition: "center right",
    }),
    MARKETING_IMG_CCTV: img("MARKETING_IMG_CCTV", "Domov + Storitve — split levo", "image1.png", "Videonadzor na objektu"),
    MARKETING_IMG_PORTAL_SOFTWARE: img(
      "MARKETING_IMG_PORTAL_SOFTWARE",
      "Produkti — kartica portala",
      "/vo-produkti-portal-card.png",
      "VisionOne portal",
    ),
    MARKETING_IMG_DOMOV_ZAKAJ_INTRO: img(
      "MARKETING_IMG_DOMOV_ZAKAJ_INTRO",
      "Domov — pasica pred Zakaj portal",
      "/vo-domov-zakaj-intro.png",
      "",
    ),
    MARKETING_IMG_DOMOV_KAJ_NUDIMO: img(
      "MARKETING_IMG_DOMOV_KAJ_NUDIMO",
      "Domov — Kaj nudimo",
      "/vo-domov-kaj-nudimo.png",
      "",
    ),
    MARKETING_IMG_DOMOV_PODPORA: img(
      "MARKETING_IMG_DOMOV_PODPORA",
      "Domov — 24/7 podpora",
      "/vo-domov-podpora.png",
      "",
    ),
    MARKETING_IMG_STORITVE_ALARM: img(
      "MARKETING_IMG_STORITVE_ALARM",
      "Storitve — alarmi",
      "/vo-storitve-alarm.png",
      "Alarmni sistemi",
    ),
    MARKETING_IMG_STORITVE_POZAR: img(
      "MARKETING_IMG_STORITVE_POZAR",
      "Storitve — požar",
      "/vo-storitve-pozar.png",
      "Požarna signalizacija",
    ),
    MARKETING_IMG_STORITVE_DOMOFON: img(
      "MARKETING_IMG_STORITVE_DOMOFON",
      "Storitve — domofon",
      "/vo-storitve-domofon.png",
      "Domofonija",
    ),
    MARKETING_IMG_STORITVE_MREZA: img(
      "MARKETING_IMG_STORITVE_MREZA",
      "Storitve — omrežje",
      "/vo-storitve-mreza.png",
      "Omrežne montaže",
    ),
    MARKETING_IMG_STORITVE_WIFI: img(
      "MARKETING_IMG_STORITVE_WIFI",
      "Storitve — Wi‑Fi",
      "/vo-storitve-wifi.png",
      "Wi‑Fi pokritost",
    ),
    MARKETING_IMG_STORITVE_SERVIS: img(
      "MARKETING_IMG_STORITVE_SERVIS",
      "Storitve — servis",
      "/vo-storitve-servis.png",
      "Podpora in servis",
    ),
    MARKETING_IMG_STORITVE_OSTALO: img(
      "MARKETING_IMG_STORITVE_OSTALO",
      "Storitve — ostalo",
      "/vo-storitve-ostalo.png",
      "Ostale montaže",
    ),
    MARKETING_IMG_PRODUKTI_POD_KARTO: img(
      "MARKETING_IMG_PRODUKTI_POD_KARTO",
      "Produkti — pod kartico",
      "/vo-produkti-pod-karto.png",
      "",
    ),
  },
  pages: {
    home: {
      hero: {
        eyebrow: "Varnost, ki deluje — ne le na papirju",
        title: "Videonadzor, mreža in proaktivni nadzor v",
        titleHighlight: "enem sistemu",
        description:
          "Od postavitve kamer in snemalnikov do 24/7 spremljanja dosegljivosti. VisionOne portal v realnem času pokaže stanje kamer, snemalnikov, stikal in diskov — vi ukrepate prej, ko izpad postane kritičen.",
        ctaPrimary: "Brezplačna ponudba",
        ctaSecondary: "Spoznaj portal",
        trustPills: ["24/7 nadzor", "Certificirani monterji", "VisionOne portal", "Hiter odziv"],
      },
      splitCctv: {
        kicker: "Celostna skrb za objekt",
        title: "Montaža, zagon, podpora — videonadzor, alarmi, požar, domofoni, omrežja",
        body: "Na terenu izvedemo montažo in zagon videonadzora, brezžičnih in hibridnih alarmnih sistemov, požarne signalizacije, domofonije ter LAN/Wi‑Fi. Nudimo dokumentacijo, servis in proaktivno spremljanje — vključno z VisionOne portalom za živ pregled kamer, snemalnikov, stikal in diskov.",
        linkLabel: "Vse storitve",
        linkHref: "/storitve",
      },
      stats: [
        { value: "100+", label: "Aktivnih objektov v nadzoru" },
        { value: "24/7", label: "Spremljanje dosegljivosti" },
        { value: "< 15 min", label: "Povprečen prvi odziv (SLA)" },
      ],
      whyIntro: {
        kicker: "Zakaj VisionOne portal",
        title: "Ena nadzorna plošča za celoten objekt",
        body: "Kamere, snemalniki, stikala in diski — status, alarmi in zgodovina na enem mestu. Manj klicev »ali deluje?«, več preventivnega ukrepanja.",
      },
    },
    storitve: {
      hero: {
        eyebrow: "Storitve",
        title: "Montaža, integracija in 24/7 podpora",
        description:
          "Na terenu in na daljavo: od prvega načrta do zagona, dokumentacije in redne podpore. Videonadzor, alarmi, požar, domofoni, omrežja in servis.",
      },
      splitCctv: {
        kicker: "Teren & podpora",
        title: "Videonadzor od montaže do 24/7 spremljanja",
        body: "Montaža in zagon kamer (notranje/zunanje), kabliranje, konfiguracija NVR/DVR in dostopa na daljavo. Vzdrževalni obiski, čiščenje objektivov, firmware, nadgradnje kapacitet in diskov. Ob dogovoru povezava z našim VisionOne portalom za živ status naprav in alarmov.",
        linkLabel: "Oglej si produkt — VisionOne portal",
        linkHref: "/produkti",
      },
      serviceBlocks: [
        {
          id: "alarm",
          title: "Brezžični in hibridni alarmni sistemi",
          body: "Načrtovanje, montaža senzorjev, central, sirene in zagon. Integracija z obstoječimi vrati/omrežjem, testiranje con in predaja stranki. Servisni posegi in nadgradnje.",
          imageKey: "MARKETING_IMG_STORITVE_ALARM",
        },
        {
          id: "pozar",
          title: "Požarna signalizacija",
          body: "Projektiranje in izvedba v skladu z veljavnimi predpisi in dogovorjenim obsegom. Vzdrževanje in periodični pregledi po dogovoru.",
          imageKey: "MARKETING_IMG_STORITVE_POZAR",
        },
        {
          id: "domofon",
          title: "Domofonija",
          body: "IP domofoni, paneli, integracija z elektro omarico in LAN/Wi‑Fi. Konfiguracija klicov, posnetkov ob obisku in oddaljenega odklepanja po dogovoru.",
          imageKey: "MARKETING_IMG_STORITVE_DOMOFON",
        },
        {
          id: "mreza",
          title: "Omrežne montaže",
          body: "LAN kabliranje, stikala, patch paneli, VLAN-i in dokumentacija. Priprava infrastrukture za kamere, alarme in Wi‑Fi.",
          imageKey: "MARKETING_IMG_STORITVE_MREZA",
        },
        {
          id: "wifi",
          title: "Wi‑Fi in pokritost",
          body: "Načrt pokritosti, access pointi, mesh in optimizacija za objekte z več nadstropji ali zunanjimi površinami.",
          imageKey: "MARKETING_IMG_STORITVE_WIFI",
        },
        {
          id: "servis",
          title: "Podpora in servis",
          body: "Redni obiski, čiščenje kamer, nadgradnje firmware, zamenjava diskov in podpora uporabnikom po dogovorjenem SLA.",
          imageKey: "MARKETING_IMG_STORITVE_SERVIS",
        },
        {
          id: "ostalo",
          title: "Ostale montaže",
          body: "Dodatne elektro in nizkonapetostne montaže po projektu — vedno v skladu z veljavnimi predpisi in dogovorom.",
          imageKey: "MARKETING_IMG_STORITVE_OSTALO",
        },
      ],
    },
    produkti: {
      hero: {
        eyebrow: "Produkti",
        title: "VisionOne portal in povezane rešitve",
        description: "Programska oprema za spremljanje objektov — od živega statusa do alarmov in poročil.",
      },
    },
    kontakt: {
      hero: {
        eyebrow: "Kontakt",
        title: "Pogovorimo se o vašem objektu",
        description: "Pošljite povpraševanje ali rezervirajte ogled — odgovorimo v najkrajšem možnem času.",
      },
      contactIntro:
        "Izpolnite obrazec ali nas pokličite. Za nujne posege na objektu uporabite telefonsko številko na strani.",
    },
  },
};
