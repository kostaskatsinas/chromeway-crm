# Deploy the free online demo (Hugging Face Spaces + Neon)

Total cost: **€0** · Time: ~30 minutes (mostly waiting for builds) · No credit card.

```
Visitors → https://<your-user>-chromeway-demo.hf.space
                    │
             HF Space (this repo, Docker)
                    │
             Neon Postgres (free, data persists)
```

---

## 1. Create the accounts (~5 min)

Sign in with GitHub on all three — no new passwords:

- [ ] [huggingface.co/join](https://huggingface.co/join)
- [ ] [neon.tech](https://neon.tech/signup) → **New project** → name `chromeway` → region **EU Central** → Create. Copy the **connection string** (pooled), keep `?sslmode=require`.
- [ ] HF access token for pushing: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → **New token** → type **Write**.

## 2. Configure secrets on the Space (~3 min)

- [ ] [huggingface.co/new-space](https://huggingface.co/new-space) → Space name `chromeway-demo` → SDK: **Docker** → Blank → **Public** → Create.
- [ ] Space → **Settings → Variables and secrets**:

| Type | Name | Value |
|---|---|---|
| Secret | `DATABASE_URL` | your Neon connection string |
| Secret | `AUTH_SECRET` | output of `openssl rand -hex 32` |
| Variable | `DEMO_AUTOSEED` | `true` |

> `DEMO_AUTOSEED=true` seeds the Greek demo dataset automatically on first boot — but only if the database has zero users, so it never wipes anything.

## 3. Push the code (~2 min + 5–10 min build)

```bash
cd ~/Documents/crm_chromeway
git remote add space https://huggingface.co/spaces/YOUR_USER/chromeway-demo
git push space main --force     # username = your HF user, password = the WRITE token
```

The Space builds the root `Dockerfile`, applies migrations and auto-seeds on boot.
Watch progress in the Space's **Logs → Building** tab. First boot seeds ~15 records of demo data.

## 4. Keep it awake (optional but recommended)

HF Spaces sleep after 48 h without traffic; a sleeping prototype takes ~2 min to wake mid-presentation.

- [ ] [uptimerobot.com](https://uptimerobot.com) → Add monitor → HTTP(s) → `https://YOUR_USER-chromeway-demo.hf.space/api/health` → every 60 min.

## 5. Demo credentials

| Email | Password |
|---|---|
| admin@chromeway.gr | `Chromeway2026!` |
| pm@chromeway.gr | `Chromeway2026!` |
| logistis@chromeway.gr | `Chromeway2026!` |

Also try the customer-facing quotation link: `/public-quote/demo-token-kyma-sent`

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails at `COPY public` | You pushed an old commit — ensure `.gitkeep` exists in `public/` and push again |
| App builds but shows "Database unavailable" | `DATABASE_URL` secret typo, or Neon project suspended → open neon.tech once to reactivate |
| Seed didn't run | Database already had a user; set it manually or wipe the Neon branch/DB |
| Wake-up takes 2 min | Space was sleeping (48 h without requests) → check UptimeRobot is enabled |
| Uploaded photos disappear after restart | Expected on the free tier — files live on ephemeral disk |

## Updating the demo later

```bash
git add . && git commit -m "…" && git push origin main && git push space main
```
