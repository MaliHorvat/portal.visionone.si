# Posodobitev baze (Prisma)

Po vlečenju sprememb sheme na vsakem okolju (lokalno, staging, produkcija):

```bash
cd VisionOne_Portal
npx prisma db push
```

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
