#!/bin/bash
set -euo pipefail

# Configuration
REPO_URL="https://github.com/sosinfo212/textilelaunch--1-.git"
DEPLOY_PATH="/opt/textilelaunch"
APP_USER="textilelaunch"
SERVICE_NAME="textilelaunch"
DOMAIN="trendycosmetix.com"
API_URL="https://trendycosmetix.com/api"
NODE_PORT="5001"
DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

# System update
dnf -y update

# Install EPEL repository
dnf -y install epel-release

# Install required packages
dnf -y install curl git firewalld nginx mariadb-server python3 python3-pip

# Install certbot via pip if not available via dnf
if ! dnf -y install certbot python3-certbot-nginx 2>/dev/null; then
    pip3 install --upgrade pip
    pip3 install certbot certbot-nginx
    CERTBOT_BIN=$(command -v certbot || echo "/usr/local/bin/certbot")
else
    CERTBOT_BIN=$(command -v certbot)
fi

# Install Node.js LTS from NodeSource
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -
    dnf -y install nodejs
fi

# Detect Node binary
NODE_BIN=$(command -v node)

# SELinux: Allow Nginx to proxy to Node
setsebool -P httpd_can_network_connect 1

# Enable and start MariaDB
systemctl enable mariadb
systemctl start mariadb

# Secure MariaDB (non-interactive)
mysql -u root <<EOF
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF

# Create database and user
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# Import schema if database is empty
if [ "$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")" -eq 0 ]; then
    if [ -f "${DEPLOY_PATH}/database/schema.sql" ]; then
        mysql -u root ${DB_NAME} < "${DEPLOY_PATH}/database/schema.sql"
    fi
fi

# Create application user
if ! id -u ${APP_USER} &> /dev/null; then
    useradd -r -s /bin/false -d ${DEPLOY_PATH} ${APP_USER}
fi

# Configure Git safe directory
git config --global --add safe.directory ${DEPLOY_PATH}

# Clone or update repository
if [ ! -d "${DEPLOY_PATH}/.git" ]; then
    rm -rf ${DEPLOY_PATH}
    git clone ${REPO_URL} ${DEPLOY_PATH}
    chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}
else
    cd ${DEPLOY_PATH}
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master
    chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}
fi

# Set ownership
chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}

# Install all dependencies (including dev dependencies for build)
cd ${DEPLOY_PATH}
sudo -u ${APP_USER} npm install

# Build frontend
sudo -u ${APP_USER} npm run build

# Generate secure session secret
SESSION_SECRET=$(openssl rand -hex 32)

# Create .env file
cat > ${DEPLOY_PATH}/.env <<EOF
NODE_ENV=production
PORT=${NODE_PORT}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
FRONTEND_URL=https://${DOMAIN}
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
EOF

chown ${APP_USER}:${APP_USER} ${DEPLOY_PATH}/.env
chmod 600 ${DEPLOY_PATH}/.env

# Create systemd service
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

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

# Configure firewall
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Create initial HTTP-only Nginx server block (before SSL)
cat > /etc/nginx/conf.d/${DOMAIN}.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root ${DEPLOY_PATH}/dist;
    index index.html;
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Cache static assets (JS, CSS, fonts) - improves repeat load
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

# Test Nginx config
nginx -t

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Obtain SSL certificate (non-interactive)
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    ${CERTBOT_BIN} --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
else
    ${CERTBOT_BIN} renew --quiet
fi

# Update Nginx config with SSL (certbot may have modified it, but ensure it's correct)
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    cat > /etc/nginx/conf.d/${DOMAIN}.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root ${DEPLOY_PATH}/dist;
    index index.html;
    
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Cache static assets (JS, CSS, fonts) - improves repeat load
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

    # Test config again
    nginx -t
fi

# Create certbot renewal systemd timer if using pip-installed certbot
if [ ! -f "/usr/lib/systemd/system/certbot.timer" ]; then
    cat > /etc/systemd/system/certbot-renew.service <<EOF
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=${CERTBOT_BIN} renew --quiet
EOF

    cat > /etc/systemd/system/certbot-renew.timer <<EOF
[Unit]
Description=Certbot Renewal Timer
After=network.target

[Timer]
OnCalendar=daily
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable certbot-renew.timer
    systemctl start certbot-renew.timer
else
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

# Reload Nginx
systemctl reload nginx

# Restart backend service
systemctl restart ${SERVICE_NAME}

# Clean old systemd logs
journalctl --vacuum-time=7d

# Final status checks
echo "=== Deployment Status ==="
echo "Node version: $(${NODE_BIN} --version)"
echo "Nginx status: $(systemctl is-active nginx)"
echo "MariaDB status: $(systemctl is-active mariadb)"
echo "${SERVICE_NAME} service status: $(systemctl is-active ${SERVICE_NAME})"
echo "API health check:"
sleep 2
curl -k -s https://${DOMAIN}/api/health || echo "Health check failed"
echo ""
echo "Deployment complete."