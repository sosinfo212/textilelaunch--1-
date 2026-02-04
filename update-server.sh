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

# Pull latest changes
git fetch origin
git reset --hard origin/main || git reset --hard origin/master

# Set ownership
chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}

# Rebuild frontend if needed
if [ -f "package.json" ]; then
    sudo -u ${APP_USER} npm install
    sudo -u ${APP_USER} npm run build
fi

# Restart service
systemctl restart ${SERVICE_NAME}

echo "✅ Server updated and restarted."
echo "Check service status: systemctl status ${SERVICE_NAME}"
