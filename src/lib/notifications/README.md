# Notification delivery (Quarbani 2026)

**Current behavior**

- **`IN_APP`:** Rows are written to the `Notification` table (`queueInAppNotification` and direct `prisma.notification.create` in routes). The admin UI lists them.
- **`WHATSAPP` / `SMS` / `EMAIL`:** Rows may be queued with these channels, but **no provider sends** them yet.

**Code map**

| File | Role |
|------|------|
| `src/lib/queue-in-app-notification.ts` | Creates `IN_APP` rows safely. |
| `src/lib/notifications/env.ts` | Documents `QURBANI_NOTIFICATION_*_DRIVER` env vars. |
| `src/lib/notifications/dispatch.ts` | `dispatchOutboundNotificationPlaceholder` — branch for future SDK calls. |
| `src/lib/delivery-channels.placeholder.ts` | Stub `sendWhatsAppPlaceholder`, `sendSmsPlaceholder`, `sendEmailPlaceholder`. |

**Emergency marking**

- New emergency leads use `NotificationType.EMERGENCY_LEAD` and `[জরুরি / EMERGENCY]` in message prefixes where implemented (`POST /api/leads`, assignments, etc.). When wiring WhatsApp, preserve that prefix in template bodies.

**Next implementation step**

1. Choose provider(s); set drivers to e.g. `twilio` or `meta`.
2. In a worker or `dispatch.ts`, call the official SDK using secrets from the host (never in git).
3. On success, update `Notification.status` to `SENT` and set `sentAt`; on failure `FAILED` + `errorMessage`.
