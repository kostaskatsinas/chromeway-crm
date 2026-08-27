# Deploy and maintain the online demo (Render + Neon)

Current source and service status, verified **27 August 2026**:

| Item | Current value |
|---|---|
| GitHub repository | `kostaskatsinas/chromeway-crm` |
| Deployment branch | `main` |
| Command-center merge | PR #1, merge commit `0dbbb9b` |
| Render service | `chromeway-crm` (Docker, Free instance) |
| Public URL | [https://chromeway-crm.onrender.com](https://chromeway-crm.onrender.com) |
| Health endpoint | [https://chromeway-crm.onrender.com/api/health](https://chromeway-crm.onrender.com/api/health) |
| Database | Neon Postgres |

The health endpoint returned HTTP 200 with `status: healthy` and `db: up` during this documentation refresh.

```text
Visitors → https://chromeway-crm.onrender.com
                    │
       Render web service (Dockerfile, main)
                    │
              Neon Postgres
```

This setup is designed for a prototype and can use the providers' free plans. Free-plan terms and limits can change; verify them before relying on the service. Render explicitly describes Free instances as preview/testing infrastructure rather than production hosting. See the official [Render Free documentation](https://render.com/docs/free), [Render Docker documentation](https://render.com/docs/docker), and [Neon connection-pooling documentation](https://neon.com/docs/connect/connection-pooling).

---

## 1. Initial account and database setup

1. Sign in to [Render](https://dashboard.render.com) with the GitHub account that can access `kostaskatsinas/chromeway-crm`.
2. Create or open a [Neon](https://console.neon.tech) project in a European region.
3. In Neon, open **Connect** and copy:
   - the **pooled** connection string (hostname contains `-pooler`) for runtime traffic;
   - the **direct** connection string (pooling disabled) for migrations and database administration.
4. Keep both connection strings secret. Do not commit them to Git.

The container entrypoint uses `DATABASE_URL` normally. When `DIRECT_URL` exists, it temporarily runs `prisma migrate deploy` with `DATABASE_URL="$DIRECT_URL"`, then starts the application with the pooled `DATABASE_URL`.

## 2. Create or verify the Render service

In Render: **New → Web Service → connect `kostaskatsinas/chromeway-crm`**.

| Setting | Value |
|---|---|
| Name | `chromeway-crm` |
| Branch | `main` |
| Runtime | Docker |
| Dockerfile | repository `Dockerfile` |
| Instance type | Free for demo use |
| Auto-deploy | Enabled for `main` |
| Health check path | `/api/health` |
| Port | `3000` (the image binds `0.0.0.0`; Render can detect it) |

Render supports Docker builds from a linked Git repository and HTTP health-check paths. Every successful push or merge to the configured branch triggers an auto-deploy when auto-deploy is enabled.

## 3. Environment variables

Set these under **Render → chromeway-crm → Environment**:

| Key | Required value |
|---|---|
| `DATABASE_URL` | Neon pooled runtime connection string |
| `DIRECT_URL` | Neon direct connection string used by the entrypoint for migrations |
| `AUTH_SECRET` | independent output of `openssl rand -hex 32` |
| `CRON_SECRET` | a second independent output of `openssl rand -hex 32` |
| `DEMO_AUTOSEED` | `true` for this demo only |
| `APP_URL` | `https://chromeway-crm.onrender.com` |
| `PORT` | `3000` |

Do not expose or copy secret values into issues, commits, screenshots, or chat. `AUTH_SECRET` and `CRON_SECRET` must not be the same value.

`DEMO_AUTOSEED=true` checks the number of users on every boot. It seeds the Greek demo dataset only when the database has zero users; it never wipes a populated database. If seeding fails, the entrypoint logs a warning and continues with the empty database, so always inspect the first deploy logs.

`DEBUG_API` is not required and should normally be absent. Temporarily setting it to `true` exposes server exception messages to authenticated UI requests and should be removed immediately after diagnostics.

## 4. First deployment verification

The Docker entrypoint performs these steps:

1. `prisma migrate deploy` using `DIRECT_URL` when available.
2. Optional non-destructive demo seed when `DEMO_AUTOSEED=true` and there are zero users.
3. `next start` on `${HOSTNAME:-0.0.0.0}:${PORT:-3000}`.

After Render reports **Live**, verify:

```bash
curl -i https://chromeway-crm.onrender.com/api/health
```

Expected result: HTTP 200 with `status: "healthy"` and `db: "up"`. Then open the login page and test one authenticated workflow.

## 5. Demo credentials

All seeded demo users use password `Chromeway2026!`:

| Email | Role |
|---|---|
| `admin@chromeway.gr` | Administrator |
| `sales@chromeway.gr` | Sales |
| `pm@chromeway.gr` | Project Manager |
| `tech@chromeway.gr` | Technician |
| `logistis@chromeway.gr` | Accountant |
| `collab@chromeway.gr` | Collaborator |

Seeded customer quotation: `/public-quote/demo-token-kyma-sent`.

These credentials are intentionally public demo credentials. Never reuse them in a production database.

## 6. Free-instance limitations

- Render Free web services spin down after 15 minutes without inbound traffic and may take about a minute to start again.
- The Render Free filesystem is ephemeral. Uploaded photos/files can disappear when the service restarts, redeploys, or spins down. Neon database records persist independently.
- Free instances have usage, bandwidth, build-minute, compute, and feature limits. They are not appropriate for production CRM data.
- Free Render services do not provide persistent disks. Production uploads should use object storage or a paid persistent disk.
- An external uptime monitor can check `/api/health`, but monitoring does not remove the platform's other Free-instance limits.

For a production deployment, use a paid service, durable object storage, encrypted off-site backups, a real email provider, rate limiting/MFA, and a restore-tested disaster-recovery procedure.

## 7. Updating the demo

The normal path is a reviewed pull request into `main`:

```bash
git switch main
git pull --ff-only origin main
npm run typecheck
npm run lint
npm test
npm run build
git push origin main
```

When `main` changes, Render auto-deploys the new Docker image. Monitor the Render **Events** and **Logs** pages until the deployment is Live and the health check passes. Use **Manual Deploy → Deploy latest commit** only when auto-deploy did not start or when intentionally redeploying the same source revision.

## 8. Troubleshooting

| Symptom | Most likely cause and action |
|---|---|
| Build fails at `COPY public` | Confirm `public/` exists in the deployed commit and redeploy. |
| Migration fails | Verify `DIRECT_URL` is the direct Neon URL and includes the required TLS query parameters; inspect entrypoint logs. |
| Health returns 503 / database unavailable | Check `DATABASE_URL`, Neon project/compute state, TLS parameters, and database reachability. |
| Login reports a generic server error | Inspect Render logs first. If necessary, temporarily set `DEBUG_API=true`, reproduce once, then remove the variable. |
| Seed did not run | The database already contains at least one user, or the seed logged an error. Auto-seed is deliberately non-destructive. |
| Uploaded photos disappeared | Expected on Render Free's ephemeral filesystem; use object storage or a paid persistent disk for durability. |
| First request is slow | Expected cold start after Free-instance idle spin-down. |
| New commit is not deployed | Confirm the service tracks `main`, auto-deploy is enabled, and build minutes are available; otherwise use Manual Deploy. |

## 9. Security checklist

- Keep `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `CRON_SECRET` only in Render's secret environment settings.
- Never put database URLs or tokens in Git history.
- Rotate secrets if they appear in a screenshot, log excerpt, issue, or chat.
- Keep `/api/health` public, but do not add sensitive diagnostics to its response.
- Do not enable `DEMO_AUTOSEED` or use the seeded credentials for production customer data.
