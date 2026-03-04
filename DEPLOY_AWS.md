# Deploying GES to an AWS EC2 instance (Ubuntu) using the provided .pem

This guide shows commands to run from *your local machine* and on the EC2 server.

Prerequisites (local):
- You have the private key `.pem` (keep it secure, do NOT commit it).
- The EC2 public IP: `16.170.206.130` (replace if different).
- Your GitHub repo is accessible from the server (public or with deploy key).

## 1) SSH to the server (from local)

```bash
# make sure pem is chmod 600
chmod 600 path/to/your-key.pem
ssh -i path/to/your-key.pem ubuntu@16.170.206.130
```

Replace `ubuntu` with your instance user (e.g., `ec2-user` for Amazon Linux).

## 2) On the EC2 instance: install dependencies

```bash
# update
sudo apt-get update && sudo apt-get upgrade -y
# install git, curl, node (LTS), psql client
sudo apt-get install -y git curl build-essential
# Node.js setup (example for v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
# install pm2 (process manager)
sudo npm install -g pm2
```

If you plan to run Postgres locally on the EC2, install Postgres; otherwise ensure the app can reach the DB host.

## 3) Clone the repo on the server

```bash
# choose deploy folder
cd ~
# clone
git clone https://github.com/dwaithdev-ship-it/GES.git
cd GES/server
```

If your repo is private, configure credentials or use deploy keys.

## 4) Add environment variables on the server

Create `server/.env` on the server (DO NOT commit). Example:

```ini
PORT=5000
DB_HOST=<your-db-host>
DB_PORT=<your-db-port>
DB_NAME=<your-db-name>
DB_USER=<db-user>
DB_PASSWORD=<db-password>
JWT_SECRET=some_long_secret
TELEGRAM_BOT_TOKEN=8632648659:AAEGumGScyd2KVLUKNf3eFFOj_WACE0J5Yk
TELEGRAM_CHAT_ID=8616539200
JOOBLE_API_KEY=<optional>
```

Use `nano server/.env` or `vim` to create the file.

## 5) Install server dependencies and run migrations

```bash
cd ~/GES/server
npm install --production
# apply SQL schema (requires psql client access to DB)
# If DB is remote (RDS), set the .env values correctly, then:
./migrate_db.sh
# then run optional JS data migration
node migrate_data.js
```

## 6) Start the server with pm2

```bash
# from server folder
pm2 start index.js --name ges-server --time
pm2 save
# enable pm2 on startup (systemd)
pm2 startup systemd
# follow printed command if any (run as sudo)
```

## 7) (Optional) Configure Nginx as reverse proxy and open firewall ports

```bash
sudo apt-get install -y nginx
# create /etc/nginx/sites-available/ges and link to sites-enabled
# basic proxy config listens on 80 and proxies to http://localhost:5000
sudo systemctl restart nginx
```

Ensure AWS security group allows inbound 80/443 (HTTP/HTTPS) and any other required ports.

## 8) Verify

On your machine:
```bash
curl -v http://16.170.206.130:5000/api/test-telegram
```

You should get a JSON response; also check PM2 logs on the server:
```bash
pm2 logs ges-server --lines 200
```

---

If you want, I can:
- prepare a `server/deploy_on_aws.sh` helper to automate steps 3–6 (you still must supply the `.env`),
- or provide exact `nginx` config and systemd/pm2 setup.

Tell me which automation you want me to add to the repo and whether the DB runs on this EC2 or elsewhere.