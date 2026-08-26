# Deploy the free online demo (Render + Neon)

Total cost: **€0** · Time: ~20 minutes · No credit card required.

```
Visitors → https://chromeway-demo.onrender.com
                    │
       Render web service (this repo, Docker, free)
                    │
             Neon Postgres (free, data persists)
```

> Why this stack: Hugging Face moved Docker Spaces behind a paid plan (July 2026).
> Render's free tier runs Docker images permanently; Render's *own* free database
> expires after 30 days — so we use Neon instead, which is free forever.

---

## 1. Create the accounts (~5 min)

Sign in with GitHub on all three:

- [ ] [render.com](https://dashboard.render.com/register)
- [ ] [neon.tech](https://neon.tech/signup) → **New project** → name `chromeway` → region **EU Central** → copy the **connection string** (keep `?sslmode=require`)
- [ ] [uptimerobot.com](https://uptimerobot.com) (optional, keeps the demo awake)

## 2. Create the web service (~5 min)

- [ ] Render dashboard → **New → Web Service** → connect the GitHub repo `chromeway-crm`
- [ ] Settings:

| Field | Value |
|---|---|
| Runtime | **Docker** (uses the repo's `Dockerfile`) |
| Instance type | **Free** |
| Health check path | `/api/health` |
| Env var `DATABASE_URL` | your Neon connection string |
| Env var `AUTH_SECRET` | output of `openssl rand -hex 32` |
| Env var `DEMO_AUTOSEED` | `true` |
| Env var `APP_URL` | `https://chromeway-demo.onrender.com` (your URL) |

- [ ] **Create Web Service.** First build takes ~5–8 min. On boot the container
      applies migrations and — because the database is empty — seeds the Greek
      demo dataset automatically (`DEMO_AUTOSEED` only ever seeds an empty
      database; it never wipes existing data).

## 3. Keep it awake (recommended)

Free Render services sleep after 15 minutes idle; waking takes ~60 seconds — awkward mid-presentation.

- [ ] UptimeRobot → **Add new monitor** → HTTP(s) → `https://chromeway-demo.onrender.com/api/health` → interval **5 minutes**.

## 4. Demo credentials

| Email | Password |
|---|---|
| admin@chromeway.gr | `Chromeway2026!` |
| pm@chromeway.gr | `Chromeway2026!` |
| logistis@chromeway.gr | `Chromeway2026!` |

Customer-facing quotation link: `/public-quote/demo-token-kyma-sent`

---

## Free-tier trade-offs (fine for a prototype)

- **Uploads are ephemeral** — photos added in the demo vanish when the service
  sleeps/redeploys. Everything in Neon (pipeline, quotes, projects) persists.
- **Cold start ~60s** if the keep-alive monitor is off or fails.
- 512 MB RAM / shared CPU — snappy enough for one viewer at a time.

## Updating the demo later

```bash
git add . && git commit -m "…" && git push origin main
```
Render auto-deploys every push to `main`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `COPY public` | Old commit — ensure `public/.gitkeep` exists and redeploy |
| "Database unavailable" screen | `DATABASE_URL` typo, or Neon project suspended → open neon.tech to reactivate |
| Seed didn't run | Database already had a user (auto-seed is deliberately non-destructive) — delete the Neon database/branch and redeploy to start fresh |
| First request slow | Cold start — enable the UptimeRobot monitor |
