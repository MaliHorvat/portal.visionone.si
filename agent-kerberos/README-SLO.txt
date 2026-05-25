VisionOne Kerberos Edge paket
=============================

Ta paket namesti Kerberos.io Agent pri stranki in majhen VisionOne collector.
Kerberos Agent obdeluje kamero lokalno, VisionOne collector pa se poveze na
VisionOne Portal in posilja health/event podatke v locen Kerberos Hub del.

Hitra namestitev
----------------
1. Namesti Docker Engine in Docker Compose plugin.
2. Kopiraj paket na edge napravo, npr. /opt/visionone-kerberos.
3. Uredi .env:
   - PORTAL_BASE_URL=https://tvoja-domena.si
   - CLAIM_CODE=VO-XXXXX-XXXXX
   - AGENT_CAPTURE_IPCAMERA_RTSP=rtsp://user:pass@kamera/stream
4. Zazeni:

   docker compose up -d

Kerberos UI
-----------
Kerberos Agent UI/API je privzeto dostopen samo lokalno:

   http://127.0.0.1:8080

Za produkcijo ne odpiraj tega porta direktno na internet. Oddaljeni dostop
naj gre kasneje prek tunela ali VisionOne proxyja.

Opomba
------
Ta paket ne uporablja placljivega Kerberos Hub-a. VisionOne Portal prevzame
vlogo centralnega huba, Kerberos Agent pa ostane edge video engine pri stranki.

