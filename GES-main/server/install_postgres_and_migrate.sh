#!/usr/bin/env bash
set -euo pipefail

# Installs PostgreSQL (Ubuntu), creates DB/user from server/.env, runs backup and migrations.
# Usage: Run on the EC2 instance (after cloning repo) as a user with sudo privileges:
#   chmod +x install_postgres_and_migrate.sh
#   sudo ./install_postgres_and_migrate.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Create server/.env with DB credentials before running."
  exit 1
fi

# load .env (ignores comments)
export $(grep -v '^#' "$ENV_FILE" | xargs)

: "${DB_HOST:?Need DB_HOST in .env}
${DB_PORT:?Need DB_PORT in .env}
${DB_NAME:?Need DB_NAME in .env}
${DB_USER:?Need DB_USER in .env}
${DB_PASSWORD:?Need DB_PASSWORD in .env}" || true

echo "Installing PostgreSQL..."
apt-get update
apt-get install -y postgresql postgresql-contrib

echo "Ensuring postgres service is running..."
systemctl enable postgresql
systemctl start postgresql

# Use sudo -u postgres psql to create role/db
echo "Configuring database and role..."

sudo -u postgres psql -v ON_ERROR_STOP=1 <<-PSQL
DO
\$do\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$do\$;
CREATE DATABASE ${DB_NAME} WITH OWNER = ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
PSQL

echo "Adjusting listen_addresses to allow remote connections (if needed)."
PG_CONF="/etc/postgresql/$(ls /etc/postgresql)/main/postgresql.conf"
PG_HBA="/etc/postgresql/$(ls /etc/postgresql)/main/pg_hba.conf"

if [ -f "$PG_CONF" ]; then
  sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF" || true
fi

echo "Adding a permissive local host rule for password auth in pg_hba.conf"
grep -q "host *all *all *md5" "$PG_HBA" || echo "host all all 0.0.0.0/0 md5" >> "$PG_HBA"

echo "Restarting PostgreSQL to apply configuration changes..."
systemctl restart postgresql

echo "Installing psql client utilities..."
apt-get install -y postgresql-client

cd "$SCRIPT_DIR"

if [ -f ./backup_db.sh ]; then
  chmod +x ./backup_db.sh
  echo "Running DB backup (before migration)..."
  ./backup_db.sh || { echo "Backup failed"; exit 1; }
fi

if [ -f ./migrate_db.sh ]; then
  chmod +x ./migrate_db.sh
  echo "Applying DB schema..."
  ./migrate_db.sh
else
  echo "migrate_db.sh not found; skipping schema apply."
fi

echo "Running data migration script in dry-run mode..."
if [ -f ./migrate_data.js ]; then
  node migrate_data.js || true
  echo "To apply migration changes, run: node migrate_data.js --apply"
fi

echo "Postgres install and migration steps completed."
