VisionOne VMS — Raspberry Pi Gateway
====================================

Stranka:   {{CUSTOMER_NAME}}
Objekt:    {{SITE_NAME}}
Gateway:   {{GATEWAY_NAME}}
Generirano: {{GENERATED_AT}}

Claim koda: {{CLAIM_CODE}}
Velja do:  {{CLAIM_EXPIRES}}

VMS API:   {{VMS_API_BASE}}

Namestitev (ročno)
------------------
1. Kopiraj vse datoteke iz tega ZIP-a na Raspberry Pi, npr. v /opt/visionone-vms-gateway
2. Preveri datoteko .env (NVR IP in IP-ji kamer)
3. Zaženi enkratno claim registracijo:
     python3 visionone_vms_gateway.py
4. Po uspešnem claimu agent ustvari gateway-state.json in nadaljuje s status heartbeat-i.

Namestitev (systemd)
--------------------
Na Pi-ju kot root:
  sudo bash install.sh

Po namestitvi:
  sudo systemctl status visionone-vms-gateway
  sudo journalctl -u visionone-vms-gateway -f

Preverjanje
-----------
- V portalu (VisionOne VMS admin) preveri, da je gateway online.
- Stranka vidi status na vms.visionone.si → Gateway.

Opombe
------
- Claim koda je enkratna. Če je že porabljena, v portalu ustvari novo in ponovno prenesi paket.
- V tej fazi gateway pošilja status NVR-ja in kamer, ne streama videa.
- Live view in playback sta načrtovana v naslednjih fazah.
