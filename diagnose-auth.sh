#!/bin/bash
set -euo pipefail

# Comprehensive authentication diagnostic and fix script
# Run this on the server as root: sudo bash diagnose-auth.sh

DEPLOY_PATH="/opt/textilelaunch"
SERVICE_NAME="textilelaunch"

echo "=== TextileLaunch Authentication Diagnostic ==="
echo ""

# Check 1: Verify .env file exists and has correct values
echo "1. Checking .env file..."
if [ ! -f "${DEPLOY_PATH}/.env" ]; then
    echo "   ❌ .env file not found!"
    echo "   Creating .env file..."
    bash fix-database.sh
else
    echo "   ✅ .env file exists"
    echo "   Checking cookie settings..."
    if grep -q "COOKIE_SECURE=true" ${DEPLOY_PATH}/.env; then
        echo "   ✅ COOKIE_SECURE=true"
    else
        echo "   ❌ COOKIE_SECURE not set to true"
        sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' ${DEPLOY_PATH}/.env || echo "COOKIE_SECURE=true" >> ${DEPLOY_PATH}/.env
        echo "   ✅ Fixed COOKIE_SECURE"
    fi
    
    if grep -q "COOKIE_SAMESITE=lax" ${DEPLOY_PATH}/.env; then
        echo "   ✅ COOKIE_SAMESITE=lax"
    else
        echo "   ❌ COOKIE_SAMESITE not set correctly"
        sed -i 's/^COOKIE_SAMESITE=.*/COOKIE_SAMESITE=lax/' ${DEPLOY_PATH}/.env || echo "COOKIE_SAMESITE=lax" >> ${DEPLOY_PATH}/.env
        echo "   ✅ Fixed COOKIE_SAMESITE"
    fi
fi
echo ""

# Check 2: Verify server code has cookie fixes
echo "2. Checking server code for cookie configuration..."
if grep -q "cookieSecure" ${DEPLOY_PATH}/server/index.js; then
    echo "   ✅ Server code has cookie configuration fixes"
else
    echo "   ❌ Server code missing cookie configuration fixes"
    echo "   Please pull latest code from GitHub:"
    echo "   cd ${DEPLOY_PATH} && git pull origin main"
fi
echo ""

# Check 3: Verify CORS includes the domain
echo "3. Checking CORS configuration..."
if grep -q "trendycosmetix.com" ${DEPLOY_PATH}/server/index.js; then
    echo "   ✅ CORS includes trendycosmetix.com"
else
    echo "   ⚠️  CORS may not include trendycosmetix.com"
fi
echo ""

# Check 4: Check service status
echo "4. Checking service status..."
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "   ✅ Service is running"
else
    echo "   ❌ Service is not running"
    echo "   Starting service..."
    systemctl start ${SERVICE_NAME}
fi
echo ""

# Check 5: Check recent service logs for errors
echo "5. Recent service logs (last 20 lines):"
journalctl -u ${SERVICE_NAME} -n 20 --no-pager | tail -10
echo ""

# Check 6: Test database connection
echo "6. Testing database connection..."
if mysql -u textilelaunch_db -p'VotreMotDePasseSecurise123!' -h 127.0.0.1 agency -e "SELECT 1;" &>/dev/null; then
    echo "   ✅ Database connection successful"
else
    echo "   ❌ Database connection failed"
    echo "   Running database fix script..."
    bash fix-database.sh
fi
echo ""

# Check 7: Verify sessions table exists
echo "7. Checking sessions table..."
if mysql -u textilelaunch_db -p'VotreMotDePasseSecurise123!' -h 127.0.0.1 agency -e "SHOW TABLES LIKE 'sessions';" | grep -q sessions; then
    echo "   ✅ Sessions table exists"
else
    echo "   ❌ Sessions table missing"
    echo "   Importing schema..."
    mysql -u root agency < ${DEPLOY_PATH}/database/schema.sql
fi
echo ""

# Final: Restart service to apply all changes
echo "8. Restarting service to apply changes..."
systemctl daemon-reload
systemctl restart ${SERVICE_NAME}
sleep 2

if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "   ✅ Service restarted successfully"
else
    echo "   ❌ Service failed to start"
    echo "   Check logs: journalctl -u ${SERVICE_NAME} -n 50"
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. Check service logs: journalctl -u ${SERVICE_NAME} -f"
echo "2. Look for 'Database connected successfully' message"
echo "3. Test login at https://trendycosmetix.com"
echo "4. Check browser DevTools > Application > Cookies for 'sessionId' cookie"
echo ""
