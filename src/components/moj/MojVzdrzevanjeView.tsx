"use client";



import { useEffect, useState } from "react";

import { AlertTriangle, HardDrive, Shield } from "lucide-react";

import type { MojOverview } from "@/lib/repositories/moj-overview";

import type { MojPreventiveItem } from "@/lib/client-preventive";



function PreventiveRow({ item }: { item: MojPreventiveItem }) {

  return (

    <li

      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-4 ${

        item.urgent

          ? "border-amber-300/60 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-950/25"

          : "border-[var(--vo-border)] bg-[var(--vo-surface)]"

      }`}

    >

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <p className="font-semibold text-[var(--vo-fg)]">{item.title}</p>

          {item.urgent ? (

            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-800/50 dark:text-amber-100">

              Kmalu

            </span>

          ) : null}

        </div>

        <p className="text-xs text-[var(--vo-muted)]">{item.kindLabel}</p>

        {item.note ? <p className="mt-2 text-sm text-[var(--vo-muted)]">{item.note}</p> : null}

      </div>

      <p className="shrink-0 text-sm font-bold text-[var(--vo-accent)]">{item.dueDate}</p>

    </li>

  );

}



export function MojVzdrzevanjeView() {

  const [data, setData] = useState<MojOverview | null>(null);



  useEffect(() => {

    void fetch("/api/moj/overview", { credentials: "include" })

      .then((r) => r.json())

      .then((j: MojOverview) => setData(j))

      .catch(() => setData(null));

  }, []);



  if (!data) {

    return <p className="text-sm text-[var(--vo-muted)]">Nalagam …</p>;

  }



  const items = data.preventiveItems;

  const diskItems = items.filter((i) => i.kind === "menjava_diska" || i.source === "disk");

  const inspectionItems = items.filter((i) => i.kind === "preventivni_pregled" || i.source === "inspection");

  const otherItems = items.filter(

    (i) => !diskItems.includes(i) && !inspectionItems.includes(i),

  );

  const noPackage = data.client && !data.client.package;



  return (

    <div className="space-y-8">

      <div>

        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Vzdrževanje &amp; preventiva</h1>

        <p className="mt-1 text-sm text-[var(--vo-muted)]">

          Dogovorjeni obiski, priporočena menjava diska in preventivni pregledi — brez tehničnega nadzora naprav.

        </p>

      </div>



      {noPackage ? (

        <div className="flex gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">

          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />

          <p>

            Nimate naročenega vzdrževalnega paketa. Priporočamo redni preventivni pregled sistema — spodaj je

            razpisan priporočen rok.

          </p>

        </div>

      ) : null}



      {items.length === 0 ? (

        <div className="rounded-xl border border-dashed border-[var(--vo-border)] px-4 py-10 text-center text-sm text-[var(--vo-muted)]">

          Trenutno ni razpisanih preventivnih rokov. Ob novih dogovorih vas obvestimo.

        </div>

      ) : null}



      {diskItems.length > 0 ? (

        <section className="space-y-3">

          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vo-fg)]">

            <HardDrive className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />

            Varnost arhiva (disk)

          </h2>

          <ul className="space-y-3">

            {diskItems.map((item) => (

              <PreventiveRow key={item.id} item={item} />

            ))}

          </ul>

        </section>

      ) : null}



      {inspectionItems.length > 0 ? (

        <section className="space-y-3">

          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vo-fg)]">

            <Shield className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />

            Preventivni pregled

          </h2>

          <ul className="space-y-3">

            {inspectionItems.map((item) => (

              <PreventiveRow key={item.id} item={item} />

            ))}

          </ul>

        </section>

      ) : null}



      {otherItems.length > 0 ? (

        <section className="space-y-3">

          <h2 className="text-sm font-bold text-[var(--vo-fg)]">Ostala vzdrževanja</h2>

          <ul className="space-y-3">

            {otherItems.map((item) => (

              <PreventiveRow key={item.id} item={item} />

            ))}

          </ul>

        </section>

      ) : null}

    </div>

  );

}

