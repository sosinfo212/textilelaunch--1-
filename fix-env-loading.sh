#!/bin/bash

# Script to fix .env loading issue

echo "🔧 Correction du chargement du fichier .env..."
echo ""

# 1. Check if .env exists
echo "1️⃣ Vérification du fichier .env..."
if [ -f "/opt/textilelaunch/.env" ]; then
    echo "✅ Fichier .env existe"
    echo ""
    echo "📋 Contenu actuel:"
    cat /opt/textilelaunch/.env
    echo ""
    
    # Check DB_USER
    DB_USER=$(grep "^DB_USER=" /opt/textilelaunch/.env | cut -d'=' -f2)
    if [ "$DB_USER" = "textilelaunch_db" ]; then
        echo "✅ DB_USER est correct: $DB_USER"
    else
        echo "❌ DB_USER est incorrect: $DB_USER (devrait être: textilelaunch_db)"
        echo "   Correction..."
        sed -i 's/^DB_USER=.*/DB_USER=textilelaunch_db/' /opt/textilelaunch/.env
        echo "✅ DB_USER corrigé"
    fi
    
    # Check DB_PASSWORD
    if grep -q "^DB_PASSWORD=" /opt/textilelaunch/.env; then
        echo "✅ DB_PASSWORD est défini"
    else
        echo "❌ DB_PASSWORD n'est pas défini"
        echo "   Ajout..."
        if ! grep -q "^DB_PASSWORD=" /opt/textilelaunch/.env; then
            sed -i '/^DB_USER=/a DB_PASSWORD=VotreMotDePasseSecurise123!' /opt/textilelaunch/.env
        fi
        echo "✅ DB_PASSWORD ajouté"
    fi
else
    echo "❌ Fichier .env n'existe PAS"
    echo "   Création..."
    cat > /opt/textilelaunch/.env <<ENVEOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=VotreMotDePasseSecurise123!
DB_NAME=agency

# Server Configuration
PORT=5001
FRONTEND_URL=http://trendycosmeticx.com
NODE_ENV=production

# JWT Secret
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Gemini API Key (optionnel)
GEMINI_API_KEY=

# VITE_API_URL
VITE_API_URL=http://localhost:5001/api
ENVEOF
    chmod 600 /opt/textilelaunch/.env
    chown textilelaunch:textilelaunch /opt/textilelaunch/.env
    echo "✅ Fichier .env créé"
fi
echo ""

# 2. Check systemd service
echo "2️⃣ Vérification du service systemd..."
if [ -f "/etc/systemd/system/textilelaunch.service" ]; then
    if grep -q "EnvironmentFile=/opt/textilelaunch/.env" /etc/systemd/system/textilelaunch.service; then
        echo "✅ EnvironmentFile configuré dans le service"
    else
        echo "❌ EnvironmentFile n'est PAS configuré"
        echo "   Correction..."
        # Backup
        cp /etc/systemd/system/textilelaunch.service /etc/systemd/system/textilelaunch.service.backup
        # Add EnvironmentFile
        sed -i '/\[Service\]/a EnvironmentFile=/opt/textilelaunch/.env' /etc/systemd/system/textilelaunch.service
        echo "✅ EnvironmentFile ajouté"
        systemctl daemon-reload
    fi
else
    echo "❌ Fichier de service n'existe PAS"
fi
echo ""

# 3. Check permissions
echo "3️⃣ Vérification des permissions..."
chown textilelaunch:textilelaunch /opt/textilelaunch/.env
chmod 600 /opt/textilelaunch/.env
echo "✅ Permissions corrigées"
echo ""

# 4. Restart service
echo "4️⃣ Redémarrage du service..."
systemctl daemon-reload
systemctl restart textilelaunch
sleep 3
echo ""

# 5. Check logs
echo "5️⃣ Vérification des logs..."
if journalctl -u textilelaunch -n 10 --no-pager | grep -q "Database connected successfully"; then
    echo "✅ Base de données connectée avec succès"
else
    echo "❌ Problème de connexion à la base de données"
    echo "   Dernières erreurs:"
    journalctl -u textilelaunch -n 10 --no-pager | grep -i error || journalctl -u textilelaunch -n 10 --no-pager
fi
echo ""

echo "📋 Résumé:"
echo "  - .env: $(test -f /opt/textilelaunch/.env && echo 'existe' || echo 'manquant')"
echo "  - DB_USER: $(grep "^DB_USER=" /opt/textilelaunch/.env 2>/dev/null | cut -d'=' -f2 || echo 'non défini')"
echo "  - EnvironmentFile: $(grep -q "EnvironmentFile" /etc/systemd/system/textilelaunch.service 2>/dev/null && echo 'configuré' || echo 'non configuré')"
echo "  - Service: $(systemctl is-active textilelaunch 2>/dev/null || echo 'inactif')"
