#!/bin/bash

# Script to diagnose and fix backend startup issues

echo "🔧 Diagnostic du démarrage du backend..."
echo ""

# 1. Check logs
echo "1️⃣ Vérification des logs du backend..."
echo "---"
journalctl -u textilelaunch -n 50 --no-pager | tail -20
echo ""

# 2. Check if .env exists
echo "2️⃣ Vérification du fichier .env..."
if [ -f "/opt/textilelaunch/.env" ]; then
    echo "✅ Fichier .env existe"
    echo "   Vérification des variables importantes:"
    grep -E "^DB_|^PORT=" /opt/textilelaunch/.env | sed 's/=.*/=***/'
else
    echo "❌ Fichier .env n'existe PAS"
    echo "   Créez-le avec setup-env.sh"
    exit 1
fi
echo ""

# 3. Check if service file exists
echo "3️⃣ Vérification du service systemd..."
if [ -f "/etc/systemd/system/textilelaunch.service" ]; then
    echo "✅ Fichier de service existe"
    if grep -q "EnvironmentFile=/opt/textilelaunch/.env" /etc/systemd/system/textilelaunch.service; then
        echo "✅ EnvironmentFile configuré"
    else
        echo "❌ EnvironmentFile n'est PAS configuré"
        echo "   Correction en cours..."
        # Backup
        cp /etc/systemd/system/textilelaunch.service /etc/systemd/system/textilelaunch.service.backup
        # Add EnvironmentFile
        sed -i '/\[Service\]/a EnvironmentFile=/opt/textilelaunch/.env' /etc/systemd/system/textilelaunch.service
        echo "✅ EnvironmentFile ajouté"
        systemctl daemon-reload
    fi
else
    echo "❌ Fichier de service n'existe PAS"
    exit 1
fi
echo ""

# 4. Check if node exists
echo "4️⃣ Vérification de Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js installé: $(node --version)"
    echo "   Chemin: $(which node)"
else
    echo "❌ Node.js n'est PAS installé"
    exit 1
fi
echo ""

# 5. Check if server/index.js exists
echo "5️⃣ Vérification des fichiers..."
if [ -f "/opt/textilelaunch/server/index.js" ]; then
    echo "✅ server/index.js existe"
else
    echo "❌ server/index.js n'existe PAS"
    exit 1
fi
echo ""

# 6. Test manual start
echo "6️⃣ Test de démarrage manuel..."
cd /opt/textilelaunch
echo "   Test avec node directement..."
timeout 5 node server/index.js 2>&1 | head -10 || echo "   (Timeout après 5 secondes - normal si ça démarre)"
echo ""

# 7. Check permissions
echo "7️⃣ Vérification des permissions..."
if [ -d "/opt/textilelaunch" ]; then
    OWNER=$(stat -c '%U' /opt/textilelaunch)
    if [ "$OWNER" = "textilelaunch" ]; then
        echo "✅ Permissions correctes (owner: $OWNER)"
    else
        echo "⚠️ Permissions incorrectes (owner: $OWNER, attendu: textilelaunch)"
        echo "   Correction: chown -R textilelaunch:textilelaunch /opt/textilelaunch"
    fi
fi
echo ""

# 8. Try to start service
echo "8️⃣ Tentative de démarrage du service..."
systemctl daemon-reload
systemctl restart textilelaunch
sleep 3

if systemctl is-active --quiet textilelaunch; then
    echo "✅ Backend démarré avec succès"
else
    echo "❌ Backend n'a PAS démarré"
    echo ""
    echo "📋 Dernières erreurs:"
    journalctl -u textilelaunch -n 20 --no-pager | grep -i error || journalctl -u textilelaunch -n 20 --no-pager
fi
echo ""

# 9. Check port
echo "9️⃣ Vérification du port 5001..."
sleep 2
if netstat -tlnp 2>/dev/null | grep -q ":5001"; then
    echo "✅ Port 5001 ouvert"
    netstat -tlnp 2>/dev/null | grep ":5001"
else
    echo "❌ Port 5001 fermé"
    echo "   Le backend ne démarre pas correctement"
fi
echo ""

# 10. Test health endpoint
echo "🔟 Test de l'endpoint health..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend répond"
    curl -s http://localhost:5001/api/health
else
    echo "❌ Backend ne répond PAS"
fi
echo ""

echo "📋 Résumé:"
echo "  - Service: $(systemctl is-active textilelaunch 2>/dev/null || echo 'inactif')"
echo "  - Port 5001: $(netstat -tlnp 2>/dev/null | grep -q ':5001' && echo 'ouvert' || echo 'fermé')"
echo ""
echo "🔍 Si le backend ne démarre toujours pas:"
echo "  1. Vérifiez les logs: journalctl -u textilelaunch -n 50"
echo "  2. Vérifiez le .env: cat /opt/textilelaunch/.env"
echo "  3. Testez manuellement: cd /opt/textilelaunch && node server/index.js"
