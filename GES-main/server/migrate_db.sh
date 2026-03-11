#!/usr/bin/env bash
# Runs the canonical SQL schema against the target Postgres DB.
# Usage:
#   ./migrate_db.sh       # reads connection from server/.env or env vars
#   DB_HOST=... DB_PORT=... DB_NAME=... DB_USER=... DB_PASSWORD=... ./migrate_db.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Load .env if present (but don't commit secrets to git)
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment from $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

: "${DB_HOST:?Need DB_HOST}
${DB_PORT:?Need DB_PORT}
${DB_NAME:?Need DB_NAME}
${DB_USER:?Need DB_USER}
${DB_PASSWORD:?Need DB_PASSWORD}" || true

# Use PGPASSWORD to avoid interactive prompt
export PGPASSWORD="$DB_PASSWORD"

echo "Applying schema: $SCRIPT_DIR/schema.sql to $DB_HOST:$DB_PORT/$DB_NAME"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/schema.sql"

echo "Schema applied successfully."