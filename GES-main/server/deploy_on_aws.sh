#!/usr/bin/env bash
# Helper script to run on EC2 after cloning repo.
# NOTE: This script assumes you will create server/.env with correct values before running.
set -euo pipefail

echo "Installing system packages..."
sudo apt-get update
sudo apt-get install -y git curl build-essential

# Node 18 (LTS)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install pm2
sudo npm install -g pm2

# Install app deps
echo "Installing app dependencies..."
cd "$(dirname "$0")"
npm install --production

# Backup DB before running migrations (if backup script exists)
if [ -f "./backup_db.sh" ]; then
  chmod +x ./backup_db.sh
  echo "Running DB backup..."
  ./backup_db.sh || echo "DB backup failed; aborting deploy." && exit 1
fi

# Run DB schema
if [ -f "./migrate_db.sh" ]; then
  chmod +x ./migrate_db.sh
  ./migrate_db.sh
fi

# Optional JS migrations (dry-run by default). To apply changes, run with --apply manually on server.
if [ -f "./migrate_data.js" ]; then
  echo "Running data migration (dry-run). To apply, ssh to server and run: node migrate_data.js --apply"
  node migrate_data.js || true
fi

# Start app with pm2
pm2 start index.js --name ges-server --time
pm2 save

# Setup pm2 startup
PM2_START_CMD=$(pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami)) | tail -n1)
# The previous command prints the command to run with sudo; print it for user
echo "Run the following command the user printed (if needed):"
echo "$PM2_START_CMD"

echo "Deployment helper finished. Check logs with: pm2 logs ges-server"