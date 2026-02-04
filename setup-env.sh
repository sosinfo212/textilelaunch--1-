#!/bin/bash

# Script to setup .env file with correct database credentials

echo "🔧 Configuration du fichier .env..."
echo ""

# Database credentials
DB_USER="textilelaunch_db"
DB_NAME="agency"
DB_PASSWORD="VotreMotDePasseSecurise123!"  # Fixed password as requested

# Generate secrets if not set
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 64)
fi

if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 64)
fi

# Create .env file
cat > /opt/textilelaunch/.env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

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

# Set proper permissions
chmod 600 /opt/textilelaunch/.env
chown textilelaunch:textilelaunch /opt/textilelaunch/.env

echo "✅ Fichier .env créé avec succès!"
echo ""
echo "📋 Configuration:"
echo "  DB_USER: $DB_USER"
echo "  DB_NAME: $DB_NAME"
echo "  DB_PASSWORD: *** (masqué)"
echo ""
echo "🔐 Secrets générés:"
echo "  JWT_SECRET: $JWT_SECRET"
echo "  SESSION_SECRET: $SESSION_SECRET"
echo ""
echo "⚠️ SAUVEZ CES SECRETS!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Vérifier que le service systemd charge le .env:"
echo "     cat /etc/systemd/system/textilelaunch.service | grep EnvironmentFile"
echo ""
echo "  2. Si EnvironmentFile n'est pas présent, l'ajouter:"
echo "     sudo nano /etc/systemd/system/textilelaunch.service"
echo "     # Ajouter sous [Service]:"
echo "     EnvironmentFile=/opt/textilelaunch/.env"
echo ""
echo "  3. Redémarrer le service:"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl restart textilelaunch"
echo ""
echo "  4. Vérifier les logs:"
echo "     journalctl -u textilelaunch -n 30 --no-pager"
echo "     # Vous devriez voir:"
echo "     # ✅ Loaded .env from: /opt/textilelaunch/.env"
echo "     # 📊 Database config: { user: 'textilelaunch_db', ... }"
echo "     # ✅ Database connected successfully"
