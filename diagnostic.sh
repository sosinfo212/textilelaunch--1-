#!/bin/bash

# Script de diagnostic pour TextileLaunch
# Usage: sudo ./diagnostic.sh

echo "=========================================="
echo "🔍 Diagnostic TextileLaunch"
echo "=========================================="
echo ""

# 1. Services
echo "1️⃣ Services:"
echo "---"
systemctl is-active --quiet textilelaunch && echo "✅ Backend: En cours d'exécution" || echo "❌ Backend: Arrêté"
systemctl is-active --quiet nginx && echo "✅ Nginx: En cours d'exécution" || echo "❌ Nginx: Arrêté"
systemctl is-active --quiet mariadb && echo "✅ MariaDB: En cours d'exécution" || echo "❌ MariaDB: Arrêté"
echo ""

# 2. Ports
echo "2️⃣ Ports ouverts:"
echo "---"
netstat -tlnp 2>/dev/null | grep -E '5001|80|3306' || echo "Aucun port trouvé"
echo ""

# 3. Backend Health
echo "3️⃣ Backend Health Check:"
echo "---"
BACKEND_HEALTH=$(curl -s http://localhost:5001/api/health 2>/dev/null)
if [ -n "$BACKEND_HEALTH" ]; then
    echo "✅ Backend accessible: $BACKEND_HEALTH"
else
    echo "❌ Backend non accessible sur localhost:5001"
fi
echo ""

# 4. Nginx Health
echo "4️⃣ Nginx Health Check:"
echo "---"
NGINX_HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
if [ -n "$NGINX_HEALTH" ]; then
    echo "✅ Nginx proxy fonctionne: $NGINX_HEALTH"
else
    echo "❌ Nginx proxy ne fonctionne pas"
fi
echo ""

# 5. Test Login (POST)
echo "5️⃣ Test Login (POST):"
echo "---"
LOGIN_TEST=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}' 2>/dev/null)
if [ -n "$LOGIN_TEST" ]; then
    if echo "$LOGIN_TEST" | grep -q "user"; then
        echo "✅ Login fonctionne"
    else
        echo "⚠️ Login retourne: $LOGIN_TEST"
    fi
else
    echo "❌ Login ne fonctionne pas"
fi
echo ""

# 6. Base de données
echo "6️⃣ Base de données:"
echo "---"
if [ -f "/opt/textilelaunch/.env" ]; then
    DB_PASS=$(grep DB_PASSWORD /opt/textilelaunch/.env | cut -d'=' -f2 | tr -d ' ')
    if mysql -u textilelaunch_db -p"$DB_PASS" -e "SELECT 1" agency 2>/dev/null >/dev/null; then
        echo "✅ Base de données accessible"
    else
        echo "❌ Base de données non accessible"
    fi
else
    echo "⚠️ Fichier .env non trouvé"
fi
echo ""

# 7. Fichiers
echo "7️⃣ Fichiers:"
echo "---"
[ -d "/opt/textilelaunch/dist" ] && echo "✅ Frontend build: dist/ existe" || echo "❌ Frontend build: dist/ manquant"
[ -f "/opt/textilelaunch/.env" ] && echo "✅ Configuration: .env existe" || echo "❌ Configuration: .env manquant"
[ -f "/opt/textilelaunch/server/index.js" ] && echo "✅ Backend: server/index.js existe" || echo "❌ Backend: server/index.js manquant"
echo ""

# 8. Logs récents
echo "8️⃣ Logs récents (Backend):"
echo "---"
journalctl -u textilelaunch -n 5 --no-pager 2>/dev/null | tail -3 || echo "Aucun log disponible"
echo ""

# 9. Configuration Nginx
echo "9️⃣ Configuration Nginx:"
echo "---"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide:"
    nginx -t 2>&1 | grep -i error
fi
echo ""

# 10. Résumé
echo "=========================================="
echo "📋 Résumé"
echo "=========================================="
echo ""
echo "Pour accéder à l'application:"
echo "  - Frontend: http://76.13.36.165"
echo "  - Backend API: http://76.13.36.165/api"
echo ""
echo "Test de login (depuis votre machine):"
echo "  curl -X POST http://76.13.36.165/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@textile.com\",\"password\":\"admin\"}'"
echo ""
echo "Voir les logs en temps réel:"
echo "  journalctl -u textilelaunch -f"
echo "  tail -f /var/log/nginx/error.log"
echo ""
