#!/bin/bash
# Add Nginx cache headers on an already-deployed server.
# Run on server as root: sudo bash update-nginx-cache.sh
# Or: cd /opt/textilelaunch && sudo bash update-nginx-cache.sh

set -euo pipefail

DEPLOY_PATH="/opt/textilelaunch"
DOMAIN="${NGINX_DOMAIN:-trendycosmetix.com}"
NODE_PORT="5001"
CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

if [ ! -f "$CONF" ]; then
  echo "Config not found: $CONF"
  echo "Set NGINX_DOMAIN if different: sudo NGINX_DOMAIN=yourdomain.com bash update-nginx-cache.sh"
  exit 1
fi

if grep -q "Cache static assets" "$CONF"; then
  echo "Cache rules already present. Nothing to do."
  exit 0
fi

cp -a "$CONF" "${CONF}.bak"

# Write HTTPS server block with cache (same as deploy.sh)
cat > "${CONF}.new" << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location / { return 301 https://\$server_name\$request_uri; }
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
    location ~* ^/assets/.*\\.(js|css|woff2?|ico|png|jpg|jpeg|gif|webp|svg)\$ {
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

mv "${CONF}.new" "$CONF"
nginx -t && systemctl reload nginx
echo "✅ Nginx cache config applied and reloaded."
echo "Backup: ${CONF}.bak"
