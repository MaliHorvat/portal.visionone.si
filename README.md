# VisionOne Field — portal.visionone.si

Aplikacija za terenskega serviserja: stranke, objekti, oprema, tlorisi, ponudbe, delovni nalogi, računi z UPN QR,
koledar terminov in katalog. Enaka aplikacija kot VisionOne Field v Dockerju, prilagojena za **Vercel + MySQL/MariaDB**.

## Zgradba

```
public/          spletna aplikacija (enaka kot field/web)
src/             strežnik: API, dokumenti za tisk, baza
  db.js          MySQL (produkcija) ali SQLite (lokalno), datoteke v tabeli blobs
  init.js        prvi zagon: skrbnik, začetni katalog, uvoz strank iz prejšnjega portala
api/handler.js   Vercel funkcija – sprejme /api/*, /print/* in /health (vercel.json → rewrites)
server.js        lokalni zagon
```

## Okoljske spremenljivke (Vercel → Settings → Environment Variables)

| Spremenljivka | Namen |
| --- | --- |
| `DATABASE_URL` | MySQL/MariaDB, `mysql://uporabnik:geslo@gostitelj:3306/baza`. Ista baza kot prejšnji portal. Posebne znake v geslu URL-kodirajte. |
| `SECRET_KEY` | Ključ za šifriranje gesel naprav in podpis prijave (`openssl rand -hex 32`). **Ne spreminjajte ga** – sicer shranjenih gesel ni več mogoče prebrati. Če manjka, se uporabi `PORTAL_SESSION_SECRET` prejšnjega portala. |
| `ADMIN_PASSWORD` | Začetno geslo skrbnika `admin` (ustvari se le, če v bazi še ni uporabnikov). Po prvi prijavi ga spremenite v Nastavitvah. |
| `ADMIN_USER` | Neobvezno, privzeto `admin`. |

## Prvi zagon in stranke iz prejšnjega portala

Ob prvi zahtevi aplikacija sama ustvari svoje tabele (`customers`, `sites`, `equipment`, `documents` …) in iz tabel
prejšnjega portala prenese:

| Prejšnji portal | VisionOne Field |
| --- | --- |
| `Client` | stranka + objekt »Objekt« (naslov, kontaktna oseba, oznake, paket in opombe) |
| `ClientCamera`, `ClientRecorder`, `ClientSwitch`, `ClientDisk` | oprema objekta (gesla kamer šifrirana) |
| `ClientDocument` | datoteke objekta |
| `MaintenanceReminder` | termini v koledarju (ob 8:00) |

Tabele prejšnjega portala ostanejo nedotaknjene. Uvoz je enkraten in ne podvaja strank (`customers.legacy_id`).
Ponovni uvoz: v tabeli `settings` izbrišite vrstico `legacy_import` – uvozijo se le še neprenesene stranke.

## Omejitve na Vercelu

- Datoteke (fotografije, tlorisi) so v bazi (tabela `blobs`). Fotografije se pred nalaganjem pomanjšajo; posamezna
  datoteka naj bo manjša od ~4 MB (omejitev zahteve na Vercelu). MySQL nastavitev `max_allowed_packet` naj bo vsaj 16 MB.
- Varnostna kopija v Nastavitvah prenese podatke v JSON brez datotek; celotno bazo izvozite pri ponudniku (phpMyAdmin).
- Stanje sistema VisionOne pri stranki (API žeton) deluje le, če je strežnik stranke dosegljiv iz interneta.

## Lokalni zagon

```
node server.js            # http://localhost:8090, SQLite v mapi data/
DATABASE_URL=mysql://… node server.js
```

Potrebuje Node.js 22. Za MySQL lokalno najprej `npm install`.
