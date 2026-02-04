#!/bin/bash

# Script to check and fix .env configuration

echo "🔍 Checking .env configuration..."
echo ""

# Check if .env exists
if [ -f "/opt/textilelaunch/.env" ]; then
    echo "✅ .env file exists"
    echo ""
    echo "📋 Current .env content:"
    cat /opt/textilelaunch/.env
    echo ""
    echo ""
    
    # Check if DB_USER is set correctly
    if grep -q "DB_USER=textilelaunch_db" /opt/textilelaunch/.env; then
        echo "✅ DB_USER is set to textilelaunch_db"
    else
        echo "❌ DB_USER is NOT set to textilelaunch_db"
        echo "   Current value:"
        grep "^DB_USER=" /opt/textilelaunch/.env || echo "   DB_USER not found in .env"
    fi
    
    # Check if DB_PASSWORD is set
    if grep -q "^DB_PASSWORD=" /opt/textilelaunch/.env; then
        DB_PASS=$(grep "^DB_PASSWORD=" /opt/textilelaunch/.env | cut -d'=' -f2)
        if [ -z "$DB_PASS" ]; then
            echo "❌ DB_PASSWORD is empty"
        else
            echo "✅ DB_PASSWORD is set (length: ${#DB_PASS} characters)"
        fi
    else
        echo "❌ DB_PASSWORD is not set"
    fi
    
else
    echo "❌ .env file does NOT exist at /opt/textilelaunch/.env"
    echo ""
    echo "Creating .env file..."
    echo ""
    read -sp "Enter DB password for textilelaunch_db: " DB_PASS
    echo ""
    read -sp "Enter JWT_SECRET (or press Enter to generate): " JWT_SECRET
    echo ""
    read -sp "Enter SESSION_SECRET (or press Enter to generate): " SESSION_SECRET
    echo ""
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64)
    fi
    if [ -z "$SESSION_SECRET" ]; then
        SESSION_SECRET=$(openssl rand -base64 64)
    fi
    
    cat > /opt/textilelaunch/.env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=$DB_PASS
DB_NAME=agency

# Server Configuration
PORT=5001
FRONTEND_URL=http://trendycosmeticx.com
NODE_ENV=production

# JWT Secret
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Gemini API Key (optionnel)
GEMINI_API_KEY=

# VITE_API_URL
VITE_API_URL=http://localhost:5001/api
EOF
    
    chmod 600 /opt/textilelaunch/.env
    chown textilelaunch:textilelaunch /opt/textilelaunch/.env
    echo "✅ .env file created"
fi

echo ""
echo "🔍 Checking systemd service configuration..."
echo ""

if [ -f "/etc/systemd/system/textilelaunch.service" ]; then
    if grep -q "EnvironmentFile=/opt/textilelaunch/.env" /etc/systemd/system/textilelaunch.service; then
        echo "✅ Service is configured to load .env file"
    else
        echo "❌ Service is NOT configured to load .env file"
        echo ""
        echo "Fixing service file..."
        # Backup
        cp /etc/systemd/system/textilelaunch.service /etc/systemd/system/textilelaunch.service.backup
        
        # Add EnvironmentFile if not present
        sed -i '/\[Service\]/a EnvironmentFile=/opt/textilelaunch/.env' /etc/systemd/system/textilelaunch.service
        
        echo "✅ Service file updated"
        echo "   Run: systemctl daemon-reload"
    fi
else
    echo "❌ Service file does not exist"
fi

echo ""
echo "🔍 Testing database connection..."
echo ""

DB_USER=$(grep "^DB_USER=" /opt/textilelaunch/.env 2>/dev/null | cut -d'=' -f2)
DB_PASS=$(grep "^DB_PASSWORD=" /opt/textilelaunch/.env 2>/dev/null | cut -d'=' -f2)

if [ -n "$DB_USER" ] && [ -n "$DB_PASS" ]; then
    if mysql -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" agency 2>/dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "   Check if user $DB_USER exists and password is correct"
    fi
else
    echo "⚠️ Cannot test connection - DB_USER or DB_PASSWORD not set"
fi

echo ""
echo "📋 Next steps:"
echo "   1. If .env was created/modified, restart the service:"
echo "      systemctl daemon-reload"
echo "      systemctl restart textilelaunch"
echo ""
echo "   2. Check logs:"
echo "      journalctl -u textilelaunch -n 20 --no-pager"
