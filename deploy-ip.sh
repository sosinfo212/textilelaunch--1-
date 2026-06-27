#!/bin/bash
set -euo pipefail

# First-time deploy on a VPS using IP only (no SSL/domain required)
REPO_URL="https://github.com/sosinfo212/textilelaunch--1-.git"
DEPLOY_PATH="/opt/textilelaunch"
APP_USER="textilelaunch"
SERVICE_NAME="textilelaunch"
SERVER_IP="${SERVER_IP:-76.13.36.165}"
NODE_PORT="5001"
DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "=== TextileLaunch deploy on ${SERVER_IP} ==="

dnf -y update
dnf -y install epel-release
dnf -y install curl git firewalld nginx mariadb-server python3 python3-pip

if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -
    dnf -y install nodejs
fi

NODE_BIN=$(command -v node)
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

systemctl enable mariadb
systemctl start mariadb

mysql -u root <<EOF
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF

mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

if ! id -u ${APP_USER} &> /dev/null; then
    useradd -r -s /bin/false -d ${DEPLOY_PATH} ${APP_USER}
fi

git config --global --add safe.directory ${DEPLOY_PATH}

if [ ! -d "${DEPLOY_PATH}/.git" ]; then
    rm -rf ${DEPLOY_PATH}
    git clone ${REPO_URL} ${DEPLOY_PATH}
else
    cd ${DEPLOY_PATH}
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master
fi

chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}

if [ "$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")" -eq 0 ]; then
    mysql -u root ${DB_NAME} < "${DEPLOY_PATH}/database/schema.sql"
fi

# Run migrations (idempotent where possible)
for sql in add-api-key-column.sql add-api-key-plaintext-column.sql add-cost-column.sql add-affiliate-integrations.sql add-payment-options.sql add-analytics-events-table.sql add-product-views-table.sql; do
    if [ -f "${DEPLOY_PATH}/database/${sql}" ]; then
        mysql -u root ${DB_NAME} < "${DEPLOY_PATH}/database/${sql}" 2>/dev/null || true
    fi
done

cd ${DEPLOY_PATH}
sudo -u ${APP_USER} npm install

if [ -f "${DEPLOY_PATH}/scrapper/requirements.txt" ]; then
    sudo -u ${APP_USER} pip3 install --user -r "${DEPLOY_PATH}/scrapper/requirements.txt"
    dnf -y install nspr nss nss-util atk at-spi2-atk cups-libs libdrm libXcomposite \
      libXdamage libXrandr mesa-libgbm pango alsa-lib libxkbcommon libXScrnSaver libXcursor 2>/dev/null || true
    python3 -m playwright install-deps chromium 2>/dev/null || true
    sudo -u ${APP_USER} python3 -m playwright install chromium
fi

sudo -u ${APP_USER} npm run build

SESSION_SECRET=$(openssl rand -hex 32)
cat > ${DEPLOY_PATH}/.env <<EOF
NODE_ENV=production
PORT=${NODE_PORT}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
FRONTEND_URL=http://${SERVER_IP}
SCRAPER_API_URL=http://${SERVER_IP}/api
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
EOF
chown ${APP_USER}:${APP_USER} ${DEPLOY_PATH}/.env
chmod 600 ${DEPLOY_PATH}/.env

cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=TextileLaunch Backend Service
After=network.target mariadb.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${DEPLOY_PATH}
EnvironmentFile=${DEPLOY_PATH}/.env
ExecStart=${NODE_BIN} ${DEPLOY_PATH}/server/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

cat > /etc/nginx/conf.d/textilelaunch.conf <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${SERVER_IP} _;

    root ${DEPLOY_PATH}/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location ~* ^/assets/.*\\.(js|css|woff2?|ico|png|jpg|jpeg|gif|webp|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx
systemctl restart ${SERVICE_NAME}

echo ""
echo "=== Deployment complete ==="
echo "App URL: http://${SERVER_IP}"
echo "API:     http://${SERVER_IP}/api/health"
echo "Node:    $(${NODE_BIN} --version)"
echo "Nginx:   $(systemctl is-active nginx)"
echo "MariaDB: $(systemctl is-active mariadb)"
echo "Service: $(systemctl is-active ${SERVICE_NAME})"
sleep 2
curl -s "http://127.0.0.1/api/health" || curl -s "http://127.0.0.1:${NODE_PORT}/api/health" || echo "Health check pending..."
