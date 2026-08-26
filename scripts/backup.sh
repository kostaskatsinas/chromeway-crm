#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Chromeway CRM — automated database backup
# Usage: ./scripts/backup.sh [output-dir]
# Schedule with cron, e.g. daily at 03:00:
#   0 3 * * * /srv/chromeway/scripts/backup.sh /var/backups/chromeway >> /var/log/chromeway-backup.log 2>&1
# ─────────────────────────────────────────────────────────
set -euo pipefail

OUT_DIR="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$OUT_DIR"

# Load DATABASE_URL from .env if present
if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  # shellcheck disable=SC1091
  export "$(grep -E '^DATABASE_URL=' .env | head -1)"
fi

if [[ -n "${CHROMEWAY_DB_CONTAINER:-}" ]] || docker ps --format '{{.Names}}' | grep -q '^chromeway-db$'; then
  echo "[backup] dumping via docker container…"
  docker exec chromeway-db pg_dump -U chromeway -Fc chromeway > "$OUT_DIR/chromeway-$STAMP.dump"
else
  echo "[backup] dumping via psql…"
  pg_dump "$DATABASE_URL" -Fc -f "$OUT_DIR/chromeway-$STAMP.dump"
fi

echo "[backup] uploads archive…"
tar -czf "$OUT_DIR/uploads-$STAMP.tar.gz" "${UPLOAD_DIR:-uploads}" 2>/dev/null || true

echo "[backup] pruning older than $KEEP_DAYS days…"
find "$OUT_DIR" -name "chromeway-*.dump" -mtime +"$KEEP_DAYS" -delete
find "$OUT_DIR" -name "uploads-*.tar.gz" -mtime +"$KEEP_DAYS" -delete

echo "[backup] ✔ done: $OUT_DIR/chromeway-$STAMP.dump"
