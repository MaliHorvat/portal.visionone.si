# VisionOne Portal

Portal za upravljanje strank, opreme, ponudb in operativnih aktivnosti VisionOne.

## Lokalni zagon

1. Kopiraj `.env.example` v `.env.local` in vnesi vrednosti.
2. Namesti odvisnosti:

```bash
npm install
```

3. Posodobi shemo in seme:

```bash
npm run db:push
npm run db:seed
```

4. Zaženi aplikacijo:

```bash
npm run dev
```

## Quality gate

```bash
npm run check
npm run build
```

## Operativni runbook (MVP)

- **Health endpoint:** `GET /api/health`
  - `200 ok`: aplikacija + baza delujeta.
  - `503 degraded`: baza ali konfiguracija pošte ni pripravljena.
- **Auth tok:** Clerk prijava -> portal login -> če je začasno geslo, obvezen prehod na `/portal/racun`.
- **Mail tok:** sistem uporablja SMTP (`PORTAL_SMTP_*`) ali Resend (`RESEND_API_KEY`, `PORTAL_RESEND_FROM`).
- **Access requests:** admin jih upravlja v `Portal -> Nastavitve`.
- **Hitra diagnostika**
  - Če ne deluje login: preveri `PORTAL_SESSION_SECRET` in Clerk ključe.
  - Če ne gre pošta: preveri `PORTAL_SMTP_*` ali Resend env in strežniške loge `[portal-mail]`.
  - Če ni podatkov: preveri `DATABASE_URL`, nato `npm run db:push`.

## Produkcija (Vercel)

- Nastavi vse env iz `.env.example`.
- Po vsaki spremembi env naredi nov deploy.
- Priporočeno: občasno preveri `/api/health` in loge za auth/mail dogodke.
