# Production deployment (Quarbani 2026 — Next.js)

This guide assumes a Linux server (Ubuntu 22.04/24.04 LTS), Node.js **20 LTS** or **22 LTS**, PostgreSQL reachable from the app host, and a domain name pointing at the server.

---

## 1. From your PC: push to GitHub safely

1. Confirm secrets are **not** committed:
   - Ensure `.env`, `.env.local`, and `.env.production` exist only locally or on the server — they must stay out of git (see root `.gitignore`).
   - Copy from `.env.example` and fill values on each environment; never paste real secrets into the repo or issues.
2. Review changes: `git status`
3. Commit: `git add -A` (verify with `git diff --cached` that no `.env*` except `.env.example` is staged).
4. Push: `git push origin <branch>`

If an env file was ever committed by mistake, remove it from history (e.g. `git filter-repo` or BFG), rotate **all** exposed secrets, and force-push only with team agreement.

---

## 2. On the server: clone or pull

**First deploy**

```bash
sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone https://github.com/<ORG>/<REPO>.git qurbani-app
cd qurbani-app
git checkout <production-branch>
```

**Updates**

```bash
cd /var/www/qurbani-app
git fetch origin
git checkout <production-branch>
git pull --ff-only origin <production-branch>
```

---

## 3. Production environment variables

Create a file **outside** the repo (recommended) or use `/var/www/qurbani-app/.env.production` with strict permissions — **never** commit it.

Template (placeholders only; align with `.env.example` in the repo):

```bash
# Required
NODE_ENV=production
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/qurbani_db?schema=public&sslmode=require"
SESSION_SECRET="<openssl rand -base64 32>"

# App URL (HTTPS, no trailing slash) — Open Graph / canonical URLs
NEXT_PUBLIC_APP_URL=https://your-domain.example

# First-time DB seed (run once if needed; see README)
# ADMIN_SEED_PASSWORD="<strong password>"
# ADMIN_SEED_EMAIL=admin@example.com
# ADMIN_SEED_PHONE=01XXXXXXXXX

# Optional: SMS, Blob, social login — see .env.example
# SMS_ENABLED=true
# BULKSMSBD_API_KEY=
# BLOB_READ_WRITE_TOKEN=
# FACEBOOK_APP_ID=
# FACEBOOK_APP_SECRET=
# GOOGLE_OAUTH_CLIENT_IDS=
```

Load env for PM2 (example below uses a single `.env` file next to the app):

```bash
sudo install -m 600 /dev/null /etc/qurbani-app.env
sudo nano /etc/qurbani-app.env   # paste variables; save
```

Point `dotenv` or your process manager at this path, or symlink: `ln -s /etc/qurbani-app.env /var/www/qurbani-app/.env.production` and ensure only root/your deploy user can read it.

---

## 4. Database: Prisma migrate deploy

Run **after** `DATABASE_URL` is set and PostgreSQL accepts connections:

```bash
cd /var/www/qurbani-app
export $(grep -v '^#' /etc/qurbani-app.env | xargs)   # or: set -a; source /etc/qurbani-app.env; set +a
npx prisma migrate deploy
```

Optional first-time data:

```bash
npm run db:seed
```

(Requires `ADMIN_SEED_PASSWORD` and related vars per `.env.example`.)

---

## 5. Install dependencies and build

Use clean installs in production:

```bash
cd /var/www/qurbani-app
npm ci
npx prisma generate
npm run build
```

Smoke-test locally on the server (optional):

```bash
PORT=3000 npm run start
```

---

## 6. PM2: start and restart

Install PM2 globally once: `sudo npm install -g pm2`

**Start**

```bash
cd /var/www/qurbani-app
export $(grep -v '^#' /etc/qurbani-app.env | xargs)
pm2 start npm --name qurbani-app -- run start
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME"
```

Follow the printed `sudo` command once so PM2 restarts on boot.

**Restart after deploy**

```bash
cd /var/www/qurbani-app
git pull --ff-only origin <production-branch>
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart qurbani-app
```

**Logs**

```bash
pm2 logs qurbani-app
```

---

## 7. Nginx reverse proxy

Example site `/etc/nginx/sites-available/qurbani` (HTTP first; Certbot will add SSL):

```nginx
upstream qurbani_next {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.example;

    location / {
        proxy_pass http://qurbani_next;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/qurbani /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. SSL with Certbot (Let’s Encrypt)

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

Renewals are typically handled by a systemd timer; test with:

```bash
sudo certbot renew --dry-run
```

After HTTPS works, ensure `NEXT_PUBLIC_APP_URL` uses `https://`.

---

## 9. Rollback notes

**Application only (no DB migration yet this deploy)**

```bash
cd /var/www/qurbani-app
git checkout <previous-commit-sha>
npm ci
npx prisma generate
npm run build
pm2 restart qurbani-app
```

**If a migration was applied you must not only revert code**

- Prefer forward-fixing with a new migration if schema is wrong.
- Restoring DB from backup is the safe rollback for bad data migrations — always take a backup before `prisma migrate deploy` on production:

```bash
pg_dump "$DATABASE_URL" > backup_qurbani_$(date +%Y%m%d_%H%M%S).sql
```

Document each production migration in your release notes so operators know whether rollback is code-only or needs DBA steps.

---

## 10. Pre-deploy checklist (CI parity)

From the repo root on a clean machine:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npx prisma validate
npx prisma generate
npm run build
```

---

## References

- `.env.example` — full variable list with comments  
- `README.md` — local development and Prisma workflow  
- `docs/Q26_PRODUCTION_HARDENING_REPORT.md` — security-oriented notes  
