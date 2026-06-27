#!/bin/bash
set -euo pipefail

# Quick update script for production server
# Run this on the server as root: sudo bash update-server.sh

DEPLOY_PATH="/opt/textilelaunch"
APP_USER="textilelaunch"
SERVICE_NAME="textilelaunch"

echo "Updating TextileLaunch server..."

cd ${DEPLOY_PATH}

# Configure Git safe directory
git config --global --add safe.directory ${DEPLOY_PATH}

# Preserve production .env before git reset (tracked .env in repo must not overwrite server secrets)
ENV_BACKUP=""
if [ -f "${DEPLOY_PATH}/.env" ]; then
  ENV_BACKUP=$(mktemp)
  cp "${DEPLOY_PATH}/.env" "${ENV_BACKUP}"
  echo "Backed up existing .env"
fi

# Pull latest changes
git fetch origin
git reset --hard origin/main || git reset --hard origin/master

if [ -n "${ENV_BACKUP}" ] && [ -f "${ENV_BACKUP}" ]; then
  cp "${ENV_BACKUP}" "${DEPLOY_PATH}/.env"
  rm -f "${ENV_BACKUP}"
  chown ${APP_USER}:${APP_USER} "${DEPLOY_PATH}/.env"
  chmod 600 "${DEPLOY_PATH}/.env"
  echo "Restored production .env after git pull"
fi

# Set ownership (after restore so .env keeps correct owner)
chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}
chmod 600 "${DEPLOY_PATH}/.env" 2>/dev/null || true

# Rebuild frontend if needed
if [ -f "package.json" ]; then
    sudo -u ${APP_USER} npm install
    sudo -u ${APP_USER} npm run build
fi

# Re-apply database config and restart (fixes .env/DB connection after git pull)
if [ -f "${DEPLOY_PATH}/fix-database.sh" ]; then
    echo "Applying database connection fix and restarting..."
    bash "${DEPLOY_PATH}/fix-database.sh"
else
    systemctl restart ${SERVICE_NAME}
    echo "✅ Server updated and restarted."
    echo "Check service status: systemctl status ${SERVICE_NAME}"
fi
echo ""
echo "To add Nginx cache headers (one-time, if not done yet): sudo bash ${DEPLOY_PATH}/update-nginx-cache.sh"
