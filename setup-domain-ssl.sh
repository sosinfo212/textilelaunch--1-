#!/bin/bash
set -euo pipefail

# Run on the server after DNS points to this VPS and SSL is (or will be) configured.
# Usage: sudo bash setup-domain-ssl.sh

DEPLOY_PATH="/opt/textilelaunch"
APP_USER="textilelaunch"
SERVICE_NAME="textilelaunch"
DOMAIN="trendycosmetix.com"
NODE_PORT="5001"

echo "=== TextileLaunch: domain + SSL setup (${DOMAIN}) ==="

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash setup-domain-ssl.sh"
  exit 1
fi

# --- 1. Update .env for HTTPS domain ---
ENV_FILE="${DEPLOY_PATH}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "❌ ${ENV_FILE} not found. Run deploy.sh or deploy-ip.sh first."
  exit 1
fi

set_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

set_env "NODE_ENV" "production"
set_env "FRONTEND_URL" "https://${DOMAIN}"
set_env "COOKIE_SECURE" "true"
set_env "COOKIE_SAMESITE" "lax"
if ! grep -q "^SCRAPER_API_URL=" "${ENV_FILE}"; then
  set_env "SCRAPER_API_URL" "https://${DOMAIN}/api"
fi

chown ${APP_USER}:${APP_USER} "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
echo "✅ .env updated: FRONTEND_URL=https://${DOMAIN}, COOKIE_SECURE=true"

# --- 2. Nginx: HTTP → HTTPS redirect + SSL server block ---
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ ! -f "${CERT}" ]; then
  echo "Obtaining Let's Encrypt certificate..."
  CERTBOT_BIN=$(command -v certbot || echo "/usr/local/bin/certbot")
  if [ ! -x "${CERTBOT_BIN}" ]; then
    echo "❌ certbot not found. Install: dnf install certbot python3-certbot-nginx  OR  pip3 install certbot certbot-nginx"
    exit 1
  fi
  ${CERTBOT_BIN} --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || true
fi

if [ -f "${CERT}" ]; then
  cat > "/etc/nginx/conf.d/${DOMAIN}.conf" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${DEPLOY_PATH}/dist;
    index index.html;
    sendfile on;
    tcp_nopush on;

    ssl_certificate ${CERT};
    ssl_certificate_key ${KEY};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

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
  systemctl reload nginx
  echo "✅ Nginx configured for HTTPS (${DOMAIN})"
else
  echo "⚠️ SSL certificate not found. Configure DNS first, then re-run this script."
fi

# --- 3. Restart app ---
systemctl restart "${SERVICE_NAME}"
echo "✅ ${SERVICE_NAME} restarted"

# --- 4. Health checks ---
echo ""
echo "=== Checks ==="
echo "Service: $(systemctl is-active ${SERVICE_NAME})"
echo "Nginx:   $(systemctl is-active nginx)"
curl -sf "https://${DOMAIN}/api/health" && echo "✅ API health OK" || echo "⚠️ API health check failed"
echo ""
echo "Site: https://${DOMAIN}"
echo "API:  https://${DOMAIN}/api/health"
