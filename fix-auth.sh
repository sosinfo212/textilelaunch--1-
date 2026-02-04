#!/bin/bash
set -euo pipefail

# Quick fix script for authentication issues on production server
# Run this on the server as root: sudo bash fix-auth.sh

DEPLOY_PATH="/opt/textilelaunch"
SERVICE_NAME="textilelaunch"

echo "Applying authentication fixes..."

cd ${DEPLOY_PATH}

# Backup current files
cp server/index.js server/index.js.bak.$(date +%Y%m%d_%H%M%S)
cp server/routes/auth.js server/routes/auth.js.bak.$(date +%Y%m%d_%H%M%S)

# Update server/index.js - Fix session cookie configuration
sed -i 's/secure: false, \/\/ Must be false for HTTP (IP-only setup)/secure: cookieSecure, \/\/ true for HTTPS, false for HTTP/' server/index.js
sed -i 's/sameSite: '\''lax'\'', \/\/ Allows cookies to be sent with cross-site requests/sameSite: cookieSameSite, \/\/ '\''none'\'' for cross-site with HTTPS, '\''lax'\'' for same-site/' server/index.js

# Check if the fix was already applied (if cookieSecure is already in the file, skip)
if ! grep -q "cookieSecure" server/index.js; then
    # Replace the session configuration block
    cat > /tmp/session_config.js <<'SESSIONEOF'
// Session configuration
// Use environment variables for cookie settings (HTTPS requires secure: true)
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');

app.use(session({
  secret: process.env.SESSION_SECRET || 'textilelaunch-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: cookieSecure, // true for HTTPS, false for HTTP
    httpOnly: true,
    sameSite: cookieSameSite, // 'none' for cross-site with HTTPS, 'lax' for same-site
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/' // Ensure cookie is available for all paths
  }
}));
SESSIONEOF

    # Find and replace the session block
    python3 <<PYTHONEOF
import re

with open('server/index.js', 'r') as f:
    content = f.read()

# Read the new session config
with open('/tmp/session_config.js', 'r') as f:
    new_config = f.read()

# Replace the old session block
pattern = r'// Session configuration.*?} \}\);'
content = re.sub(pattern, new_config, content, flags=re.DOTALL)

with open('server/index.js', 'w') as f:
    f.write(content)
PYTHONEOF
fi

# Update server/routes/auth.js - Fix cookie options
if ! grep -q "cookieSecure" server/routes/auth.js; then
    python3 <<PYTHONEOF
import re

with open('server/routes/auth.js', 'r') as f:
    content = f.read()

# Replace the cookie options block
old_pattern = r"      // Set session cookie \(session ID\).*?sameSite: 'lax' // Allows cookies to be sent with cross-site requests"
new_config = """      // Set session cookie (session ID)
      // Use environment variables for cookie settings (HTTPS requires secure: true)
      const cookieSecure = process.env.COOKIE_SECURE === 'true';
      const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');
      
      const cookieOptions = {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/', // Ensure cookie is available for all paths
        secure: cookieSecure, // true for HTTPS, false for HTTP
        sameSite: cookieSameSite // 'none' for cross-site with HTTPS, 'lax' for same-site
      };"""

content = re.sub(old_pattern, new_config, content, flags=re.DOTALL)

with open('server/routes/auth.js', 'w') as f:
    f.write(content)
PYTHONEOF
fi

# Update CORS to include trendycosmetix.com
if ! grep -q "trendycosmetix.com" server/index.js; then
    sed -i "s/'http:\/\/trendycosmeticx.com',/'http:\/\/trendycosmetix.com',\n    'https:\/\/trendycosmetix.com',\n    'http:\/\/trendycosmeticx.com',/" server/index.js
fi

# Restart the service
systemctl restart ${SERVICE_NAME}

echo "✅ Authentication fixes applied. Service restarted."
echo "Please test the login and product creation again."
