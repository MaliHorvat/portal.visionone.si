"use client";

import { useState } from "react";
import { Download, RadioTower } from "lucide-react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

type BundleMeta = {
  agentId: string;
  claimCode: string;
  claimExpiresAt: string;
  osTarget: string;
};

export function TabRpiAgent({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured } = ctx;
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<BundleMeta | null>(null);

  async function downloadBundle() {
    if (!dbConfigured) {
      showToast("Baza ni nastavljena.", "err");
      return;
    }
    setBusy(true);
    setMeta(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/rpi-agent-bundle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(j.error ?? "Generiranje paketa ni uspelo.", "err");
        return;
      }
      const agentId = res.headers.get("X-VisionOne-Agent-Id") ?? "";
      const claimCode = res.headers.get("X-VisionOne-Claim-Code") ?? "";
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `visionone-rpi-${client.slug ?? clientId}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMeta({
        agentId,
        claimCode,
        claimExpiresAt: "",
        osTarget: "Raspberry Pi OS 64-bit",
      });
      showToast("Paket za SD kartico je prenesen.");
    } catch {
      showToast("Prenos ni uspel.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]">
            <RadioTower className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--vo-fg)]">Raspberry Pi agent</h2>
            <p className="mt-1 text-sm text-[var(--vo-muted)]">
              Portal sam ustvari <strong className="font-medium text-[var(--vo-fg)]">agent ID</strong>,{" "}
              <strong className="font-medium text-[var(--vo-fg)]">claim kodo</strong> in namestitev za{" "}
              <strong className="font-medium text-[var(--vo-fg)]">Raspberry Pi OS 64-bit</strong>. Prenesete
              ZIP, kopirate mapo <code className="rounded bg-[var(--vo-surface-2)] px-1">boot</code> na SD boot
              particijo pred prvim vklopom — brez ročnega SSH.
            </p>
          </div>
        </div>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-[var(--vo-muted)]">
          <li>Raspberry Pi Imager → napišite uradni Raspberry Pi OS na microSD.</li>
          <li>
            Odprite boot particijo na PC-ju in kopirajte vse iz ZIP mape{" "}
            <code className="rounded bg-[var(--vo-surface-2)] px-1">boot/</code> vanjo (poleg obstoječih
            datotek).
          </li>
          <li>Vstavite SD v Pi, omrežje (ethernet priporočeno), napajanje.</li>
          <li>
            Po nekaj minutah preverite v portalu zavihek Agenti ali nadzorno ploščo — agent se sam registrira in
            bere kamere/NVR/switch IP-je te stranke.
          </li>
        </ol>

        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void downloadBundle()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--vo-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy ? "Pripravljam paket…" : "Prenesi paket za SD kartico (ZIP)"}
        </button>

        {meta ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4 text-sm">
            <p>
              <span className="text-[var(--vo-muted)]">Agent ID:</span>{" "}
              <code className="text-[var(--vo-fg)]">{meta.agentId}</code>
            </p>
            <p>
              <span className="text-[var(--vo-muted)]">Claim koda (v boot datoteki):</span>{" "}
              <code className="text-[var(--vo-fg)]">{meta.claimCode}</code>
            </p>
            <p className="text-xs text-[var(--vo-muted)]">
              Agent in claim sta že vpisana v bazo za stranko {client.name}. Claim velja 14 dni.
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="font-medium">Pomembno za produkcijo</p>
        <p className="mt-1 text-amber-100/90">
          Na Vercelu morata biti nastavljena <code>DATABASE_URL</code> in{" "}
          <code>ESP_INGEST_TOKEN</code>. Opcijsko <code>NEXT_PUBLIC_PORTAL_BASE_URL=https://portal.visionone.si</code>{" "}
          za pravilen URL v claim datoteki.
        </p>
      </div>
    </div>
  );
}
