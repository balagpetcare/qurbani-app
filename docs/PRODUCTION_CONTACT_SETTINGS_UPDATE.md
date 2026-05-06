# Production: official contact numbers refresh

Code defaults and seed definitions use one public line (`8801701022274`):

| Setting key | Value (JSON string) |
|-------------|---------------------|
| `contact.phone_call` | `8801701022274` |
| `contact.whatsapp` | `8801701022274` |
| `contact.emergency_hotline` | `8801701022274` |

`npm run db:seed` **does not overwrite** existing `SiteSetting.value` rows (only labels/metadata). For databases created before this change, pick **one** approach:

### Option A — Admin UI (recommended)

1. Sign in as admin → `/admin/settings`.
2. Set **কল করার নম্বর**, **WhatsApp নম্বর**, and **জরুরি হটলাইন** to `8801701022274`.

### Option B — SQL (PostgreSQL)

After backup, run:

```sql
UPDATE "SiteSetting"
SET value = '"8801701022274"'::jsonb
WHERE key IN ('contact.phone_call', 'contact.whatsapp', 'contact.emergency_hotline');
```

Verify:

```sql
SELECT key, value FROM "SiteSetting"
WHERE key LIKE 'contact.%'
ORDER BY key;
```

Public UI maps these to **`01701022274`**, **`tel:+8801701022274`**, and **`https://wa.me/8801701022274`**.
