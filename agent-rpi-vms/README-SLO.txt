VisionOne VMS — Raspberry Pi Gateway
====================================

Stranka:   {{CUSTOMER_NAME}}
Objekt:    {{SITE_NAME}}
Gateway:   {{GATEWAY_NAME}}
Generirano: {{GENERATED_AT}}

Claim koda: {{CLAIM_CODE}}
Velja do:  {{CLAIM_EXPIRES}}

VMS API:   {{VMS_API_BASE}}

HITRO (3 koraki)
----------------
1. Razpakiraj ZIP na Pi (npr. ~/visionone-gateway)
2. cd ~/visionone-gateway && sudo bash install.sh
3. sudo journalctl -u visionone-vms-gateway -f

Podrobna navodila: odpri NAVODILA-Pi-SLO.txt v tej mapi.

Kaj agent dela
--------------
- Sam preskenira lokalno omrežje in poišče NVR + kamere
- Pošilja status na {{VMS_API_BASE}}
- Ob vklopu Pi-ja se sam zažene (systemd)

Podpora: VisionOne
