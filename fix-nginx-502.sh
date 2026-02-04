#!/bin/bash

# Script to fix 502 Bad Gateway error
# This usually means Nginx can't connect to the backend

echo "🔧 Diagnostic et correction du 502 Bad Gateway..."
echo ""

# 1. Check if backend is running
echo "1️⃣ Vérification du backend..."
if systemctl is-active --quiet textilelaunch; then
    echo "✅ Backend est en cours d'exécution"
else
    echo "❌ Backend n'est PAS en cours d'exécution"
    echo "   Démarrage du backend..."
    systemctl start textilelaunch
    sleep 3
fi

# 2. Check if backend is listening on port 5001
echo ""
echo "2️⃣ Vérification du port 5001..."
if netstat -tlnp 2>/dev/null | grep -q ":5001"; then
    echo "✅ Backend écoute sur le port 5001"
    netstat -tlnp 2>/dev/null | grep ":5001"
else
    echo "❌ Backend n'écoute PAS sur le port 5001"
    echo "   Vérifiez les logs: journalctl -u textilelaunch -n 50"
fi

# 3. Test backend directly
echo ""
echo "3️⃣ Test du backend directement..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend répond sur localhost:5001"
else
    echo "❌ Backend ne répond PAS sur localhost:5001"
    echo "   Vérifiez les logs: journalctl -u textilelaunch -n 50"
fi

# 4. Check Nginx configuration
echo ""
echo "4️⃣ Vérification de la configuration Nginx..."
if [ -f "/etc/nginx/conf.d/textilelaunch.conf" ]; then
    echo "✅ Fichier de configuration Nginx existe"
    echo ""
    echo "📋 Configuration actuelle:"
    cat /etc/nginx/conf.d/textilelaunch.conf
    echo ""
    
    # Check if proxy_pass is correct
    if grep -q "proxy_pass.*textilelaunch_backend" /etc/nginx/conf.d/textilelaunch.conf; then
        echo "✅ proxy_pass configuré pour textilelaunch_backend"
    else
        echo "❌ proxy_pass n'est PAS configuré correctement"
    fi
    
    # Check if server_name includes IP
    if grep -q "server_name.*76.13.36.165" /etc/nginx/conf.d/textilelaunch.conf; then
        echo "✅ server_name inclut l'IP 76.13.36.165"
    else
        echo "⚠️ server_name n'inclut PAS l'IP 76.13.36.165"
        echo "   Correction recommandée: ajouter 76.13.36.165 dans server_name"
    fi
else
    echo "❌ Fichier de configuration Nginx n'existe PAS"
    echo "   Création de la configuration..."
    
    cat > /etc/nginx/conf.d/textilelaunch.conf <<NGINXEOF
# Upstream backend
upstream textilelaunch_backend {
    server localhost:5001;
}

# Frontend (served by Nginx)
server {
    listen 80;
    server_name 76.13.36.165 trendycosmeticx.com www.trendycosmeticx.com;

    root /opt/textilelaunch/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://textilelaunch_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Cookie support
        proxy_cookie_path / /;
        proxy_set_header Cookie \$http_cookie;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF
    
    echo "✅ Configuration Nginx créée"
fi

# 5. Test Nginx configuration
echo ""
echo "5️⃣ Test de la configuration Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Configuration Nginx invalide:"
    nginx -t
fi

# 6. Restart Nginx
echo ""
echo "6️⃣ Redémarrage de Nginx..."
systemctl restart nginx
sleep 2

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx redémarré avec succès"
else
    echo "❌ Erreur lors du redémarrage de Nginx"
    echo "   Vérifiez les logs: journalctl -u nginx -n 50"
fi

# 7. Test via Nginx
echo ""
echo "7️⃣ Test via Nginx..."
if curl -s http://localhost/api/health > /dev/null; then
    echo "✅ Nginx proxy fonctionne"
else
    echo "❌ Nginx proxy ne fonctionne PAS"
    echo "   Vérifiez les logs: tail -f /var/log/nginx/error.log"
fi

echo ""
echo "📋 Résumé:"
echo "  - Backend: $(systemctl is-active textilelaunch 2>/dev/null || echo 'inactif')"
echo "  - Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'inactif')"
echo "  - Port 5001: $(netstat -tlnp 2>/dev/null | grep -q ':5001' && echo 'ouvert' || echo 'fermé')"
echo ""
echo "🔍 Commandes utiles:"
echo "  - Logs backend: journalctl -u textilelaunch -f"
echo "  - Logs Nginx: tail -f /var/log/nginx/error.log"
echo "  - Test backend: curl http://localhost:5001/api/health"
echo "  - Test Nginx: curl http://localhost/api/health"
