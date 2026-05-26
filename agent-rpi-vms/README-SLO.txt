VisionOne VMS — Raspberry Pi Gateway
====================================

Stranka:   {{CUSTOMER_NAME}}
Objekt:    {{SITE_NAME}}
Gateway:   {{GATEWAY_NAME}}
Generirano: {{GENERATED_AT}}

Claim koda: {{CLAIM_CODE}}
Velja do:  {{CLAIM_EXPIRES}}

VMS API:   {{VMS_API_BASE}}

Kako deluje
-----------
Gateway sam preskenira lokalno omrežje (/24) in poišče NVR-je ter kamere (porti 554, 80, 8000, 37777).
IP-jev kamer ni treba ročno vnašati v portal ali v .env.

Namestitev (systemd)
--------------------
Na Pi-ju kot root:
  sudo bash install.sh

Po namestitvi:
  sudo systemctl status visionone-vms-gateway
  sudo journalctl -u visionone-vms-gateway -f

V logu pričakuj:
  scanning local network…
  discovered X devices
  status sent online discovered=X cameras=Y nvr=192.168.x.x

Preverjanje
-----------
- V portalu (VisionOne VMS admin) se NVR IP in kamere posodobijo samodejno.
- Stranka vidi status na vms.visionone.si.

Opcijsko (.env)
---------------
- AUTO_DISCOVER=1
- SCAN_SUBNET=192.168.1.0/24  (samo če avtomatska detekcija subnet-a ne ustreza)
- NVR_IP=...  (ročni override, običajno ni potreben)
