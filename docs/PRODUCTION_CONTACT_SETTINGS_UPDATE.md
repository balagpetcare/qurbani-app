# Production: official contact numbers refresh

Code defaults and seed definitions now use:

| Setting key | Value (JSON string) |
|-------------|---------------------|
| `contact.phone_call` | `8801881227204` |
| `contact.whatsapp` | `8801701022274` |
| `contact.emergency_hotline` | `8801881227204` |

`npm run db:seed` **does not overwrite** existing `SiteSetting.value` rows (only labels/metadata). For databases created before this change, pick **one** approach:

### Option A — Admin UI (recommended)

1. Sign in as admin → `/admin/settings`.
2. Set **কল করার নম্বর**, **WhatsApp নম্বর**, and **জরুরি হটলাইন** to the digit strings above (`8801…` form).

### Option B — SQL (PostgreSQL)

After backup, run:

```sql
UPDATE "SiteSetting"
SET value = '"8801881227204"'::jsonb
WHERE key IN ('contact.phone_call', 'contact.emergency_hotline');

UPDATE "SiteSetting"
SET value = '"8801701022274"'::jsonb
WHERE key = 'contact.whatsapp';
```

Verify:

```sql
SELECT key, value FROM "SiteSetting"
WHERE key LIKE 'contact.%'
ORDER BY key;
```

Public UI maps these to **01881-227204** (`tel:01881227204`), **+880 1701-022274**, and `https://wa.me/8801701022274`.
