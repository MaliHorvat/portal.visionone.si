VisionOne Frigate Edge paket
============================

Ta paket je namenjen mini PC / NUC / Raspberry Pi lokaciji pri stranki.
Na lokaciji teceta Frigate NVR in VisionOne Frigate agent. Agent se poveze
v VisionOne Portal, posilja healthcheck in Frigate dogodke, video pa ostane
lokalno na napravi.

Hitra namestitev
----------------
1. Namesti Docker Engine in Docker Compose plugin.
2. Kopiraj vsebino tega paketa na edge napravo, npr. /opt/visionone-frigate.
3. Uredi datoteko .env:
   - PORTAL_BASE_URL=https://tvoja-domena.si
   - CLAIM_CODE=VO-XXXXX-XXXXX
   - AGENT_NAME=Frigate - stranka
   - SITE_LABEL=Lokacija stranke
4. Uredi config/frigate.yml in dodaj RTSP kamere.
5. Zazeni:

   docker compose up -d

Portal
------
Agent najprej porabi claim kodo prek /api/telemetry/claim, nato vsakih nekaj
sekund posilja podatke na /api/vms/ingest. Claim koda in agent sta ustvarjena
v VisionOne Portalu pri stranki.

Varnost
-------
Frigate UI je privzeto izpostavljen samo lokalno na portu 5000. Ne odpiraj
RTSP kamer ali Frigate UI direktno na internet. Za oddaljeni live view kasneje
uporabi tunel/proxy prek VisionOne.

