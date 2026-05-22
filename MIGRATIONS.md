# Posodobitev baze (Prisma)

Po vlečenju sprememb sheme na vsakem okolju (lokalno, staging, produkcija):

```bash
cd VisionOne_Portal
npm install
npx prisma db push
```

**Vercel:** v projektu mora biti nastavljen `DATABASE_URL` (isti MySQL kot lokalno). Ob deployu se shema posodobi z `prisma db push` in `npm run db:fix-json` (glej `vercel.json` → `buildCommand`).

Če vidite *Unexpected end of JSON input*, v bazi so pokvarjena JSON polja (npr. `Client.tags`). Lokalno: `npm run db:fix-json`. Ob deployu se to izvede samodejno.

Če stran še kaže rdeče opozorilo, preverite **Vercel → Logs** in da MySQL dovoli povezave z Vercel strežnikov.

**Prisma:** `prisma` in `@prisma/client` morata biti **ista različica** (npr. 6.19.3). Neskladje povzroči napake ob zagonu.

Za produkcijo lahko namesto `db push` uporabite formalne migracije (`prisma migrate deploy`), če jih vzdržujete v repozitoriju.

## Nove tabele / polja (povzetek)

- `Client.tags` (JSON), `ClientProfileNote`, `ClientProfileChangeLog`
- `ClientOffer.offerNumber`, `ClientOffer.offerStatus`, `OfferTemplate`
- `ServiceRequestAttachment`
- `PortalIpamEntry`
- `TelegramNotificationRule`

## Okoljske spremenljivke

- `CRON_SECRET` — za `/api/cron/digest` (poizvedbeni parameter `secret`)
- Obstoječe: `DATABASE_URL`, Clerk, Telegram, e-pošta za kontakt
