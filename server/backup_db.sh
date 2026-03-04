#!/usr/bin/env bash
set -euo pipefail

# Backup Postgres database to server/backups with timestamped filename
# Usage: ./backup_db.sh
# Requires: PGPASSWORD in environment or DB_PASSWORD in server/.env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

: "${DB_HOST:?Need DB_HOST}
${DB_PORT:?Need DB_PORT}
${DB_NAME:?Need DB_NAME}
${DB_USER:?Need DB_USER}
${DB_PASSWORD:?Need DB_PASSWORD}" || true

export PGPASSWORD="$DB_PASSWORD"

BACKUP_DIR="$SCRIPT_DIR/backups"
mkdir -p "$BACKUP_DIR"
TS=$(date +"%Y%m%d_%H%M%S")
OUT_FILE="$BACKUP_DIR/ges_backup_${TS}.sql.gz"

echo "Creating database backup to $OUT_FILE"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc "$DB_NAME" | gzip > "$OUT_FILE"

echo "Backup completed: $OUT_FILE"
ls -lh "$OUT_FILE"

exit 0
