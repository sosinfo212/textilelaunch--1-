#!/bin/bash

# Script to diagnose login 500 error

echo "🔍 Diagnostic de l'erreur 500 lors du login..."
echo ""

# 1. Check backend logs
echo "1️⃣ Logs du backend (dernières 50 lignes):"
echo "---"
journalctl -u textilelaunch -n 50 --no-pager | tail -30
echo ""

# 2. Check if backend is running
echo "2️⃣ Statut du backend:"
if systemctl is-active --quiet textilelaunch; then
    echo "✅ Backend en cours d'exécution"
else
    echo "❌ Backend arrêté"
    echo "   Démarrage..."
    systemctl start textilelaunch
    sleep 3
fi
echo ""

# 3. Test login endpoint directly
echo "3️⃣ Test du endpoint login:"
echo "---"
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}' \
  -v 2>&1 | grep -E "< HTTP|error|Error" || echo "Réponse complète ci-dessus"
echo ""

# 4. Check database connection
echo "4️⃣ Test de connexion à la base de données:"
mysql -u textilelaunch_db -p'VotreMotDePasseSecurise123!' agency -e "SELECT COUNT(*) as user_count FROM users;" 2>&1
echo ""

# 5. Check if admin user exists
echo "5️⃣ Vérification de l'utilisateur admin:"
mysql -u textilelaunch_db -p'VotreMotDePasseSecurise123!' agency -e "SELECT id, email, name, role FROM users WHERE email='admin@textile.com';" 2>&1
echo ""

# 6. Check if bcrypt is installed
echo "6️⃣ Vérification de bcrypt:"
cd /opt/textilelaunch
if [ -d "node_modules/bcrypt" ]; then
    echo "✅ bcrypt installé"
else
    echo "❌ bcrypt NON installé"
    echo "   Installation..."
    npm install bcrypt
fi
echo ""

# 7. Check .env file
echo "7️⃣ Vérification du fichier .env:"
if [ -f "/opt/textilelaunch/.env" ]; then
    echo "✅ Fichier .env existe"
    echo "   Variables importantes:"
    grep -E "^DB_|^JWT_|^SESSION_" /opt/textilelaunch/.env | sed 's/=.*/=***/'
else
    echo "❌ Fichier .env n'existe PAS"
fi
echo ""

echo "📋 Commandes utiles:"
echo "  - Logs en temps réel: journalctl -u textilelaunch -f"
echo "  - Redémarrer backend: systemctl restart textilelaunch"
echo "  - Vérifier les erreurs: journalctl -u textilelaunch -n 100 | grep -i error"
