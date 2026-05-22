VisionOne — Raspberry Pi agent (priprava SD kartice)
====================================================

Priporočeno: Raspberry Pi OS 64-bit (Bookworm ali novejši), Lite ali Desktop.

KORAKI (brez ročnega nastavljanja na Pi-ju):
1. S Raspberry Pi Imager napišite uradni Raspberry Pi OS na microSD.
2. Pred prvim vklopom odprite particijo boot na računalniku (Windows: pogosto "bootfs").
3. Iz tega ZIP-a na boot particijo kopirajte:
   - vse datoteke iz mape "boot"
   - mapo "opt" (celotno) — na boot particiji mora biti pot opt/visionone-agent/...
4. Vstavite SD v Raspberry Pi, priključite ethernet/Wi‑Fi in napajanje.
5. Po 3–10 minutah naj agent v portalu prikaže "Zadnji kontakt".

Podatki tega paketa:
  Stranka:     {{CLIENT_NAME}}
  Agent ID:    {{AGENT_ID}}
  Claim koda:  {{CLAIM_CODE}}
  Portal:      {{PORTAL_URL}}

Opomba: Claim koda velja do {{CLAIM_EXPIRES}}.

Če se agent ne poveže, preverite internet na Pi-ju in da je ESP_INGEST_TOKEN nastavljen na Vercelu.
