#!/bin/sh
# ── Chromeway CRM runtime entrypoint ──────────────────────────
# Applies migrations, optionally seeds an EMPTY database (demo),
# then starts Next.js. Used by both VPS and Hugging Face Spaces.
set -e

# Neon pattern: run migrations through the DIRECT endpoint when DIRECT_URL is
# provided (PgBouncer transaction mode limits some session features). The env
# override works because schema.prisma reads env("DATABASE_URL").
if [ -n "$DIRECT_URL" ]; then
  echo "[entrypoint] applying database migrations (direct endpoint)…"
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
  echo "[entrypoint] applying database migrations…"
  npx prisma migrate deploy
fi

if [ "$DEMO_AUTOSEED" = "true" ]; then
  echo "[entrypoint] DEMO_AUTOSEED=true → checking whether database is empty…"
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count()
      .then((n) => { console.log('[entrypoint] existing users:', n); p.\$disconnect(); process.exit(n === 0 ? 0 : 1); })
      .catch(() => process.exit(2));
  "; then
    echo "[entrypoint] database is empty → seeding Greek demo dataset…"
    npx tsx prisma/seed.ts || echo "[entrypoint] ⚠ seed failed — continuing with empty database"
  else
    echo "[entrypoint] database not empty → keeping existing data"
  fi
fi

echo "[entrypoint] starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec npx next start -H "${HOSTNAME:-0.0.0.0}" -p "${PORT:-3000}"
