    #!/bin/bash

    # Script de déploiement complet pour TextileLaunch sur AlmaLinux 10
    # Usage: sudo ./deploy-complete.sh

    set -e

    # Colors
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'

    echo -e "${GREEN}🚀 Déploiement de TextileLaunch sur AlmaLinux 10${NC}"
    echo ""

    # Vérifier que nous sommes root
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}❌ Veuillez exécuter ce script en tant que root (sudo)${NC}"
        exit 1
    fi

    # Étape 1: Mise à jour
    echo -e "${GREEN}📦 Étape 1/18: Mise à jour du système...${NC}"
    dnf update -y
    dnf install -y epel-release

    # Étape 2: Installation des dépendances
    echo -e "${GREEN}📦 Étape 2/18: Installation des dépendances système...${NC}"
    dnf install -y \
        git \
        curl \
        wget \
        tar \
        gzip \
        unzip \
        zip \
        vim \
        nano \
        htop \
        net-tools \
        bind-utils \
        mariadb-server \
        mariadb \
        nginx \
        firewalld \
        openssl \
        openssh-server \
        which \
        make \
        gcc \
        gcc-c++ \
        python3 \
        python3-pip \
        certbot \
        python3-certbot-nginx

    # Étape 3: Installation Node.js
    echo -e "${GREEN}📦 Étape 3/18: Installation de Node.js 20...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
    fi
    echo "Node.js: $(node --version)"
    echo "npm: $(npm --version)"

    # Étape 4: Configuration MariaDB
    echo -e "${GREEN}🗄️ Étape 4/18: Configuration de MariaDB...${NC}"
    systemctl enable mariadb
    systemctl start mariadb
    sleep 5

    # Étape 5: Configuration des variables (base de données déjà créée)
    echo -e "${GREEN}⚙️ Étape 5/18: Configuration...${NC}"
    
    # Set fixed database password (database already created)
    DB_PASS="VotreMotDePasseSecurise123!"
    echo -e "${GREEN}✅ Mot de passe DB: VotreMotDePasseSecurise123!${NC}"
    echo -e "${YELLOW}ℹ️  Base de données déjà créée - étape de création ignorée${NC}"

    # Générer des secrets
    JWT_SECRET=$(openssl rand -base64 64)
    SESSION_SECRET=$(openssl rand -base64 64)

    # Étape 6: Cloner l'application
    echo -e "${GREEN}📥 Étape 6/18: Clonage de l'application depuis GitHub...${NC}"
    cd /opt
    if [ -d "textilelaunch" ]; then
        echo "Répertoire existe déjà, backup..."
        mv textilelaunch textilelaunch.backup.$(date +%Y%m%d_%H%M%S)
    fi
    git clone https://github.com/sosinfo212/textilelaunch--1-.git textilelaunch
    cd textilelaunch

    # Étape 7: Installation des dépendances npm
    echo -e "${GREEN}📦 Étape 7/18: Installation des dépendances npm...${NC}"
    npm install

    # Étape 8: Build du frontend
    echo -e "${GREEN}🔨 Étape 8/18: Build du frontend...${NC}"
    npm run build

    # Étape 9: Vérification de la base de données (déjà initialisée)
    echo -e "${GREEN}🗄️ Étape 9/18: Vérification de la base de données...${NC}"
    echo -e "${YELLOW}ℹ️  Base de données déjà initialisée - étape d'import ignorée${NC}"
    echo -e "${GREEN}✅ Base de données prête${NC}"

    # Étape 10: Création du fichier .env
    echo -e "${GREEN}⚙️ Étape 10/18: Création du fichier .env...${NC}"
    cat > .env <<ENVEOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=${DB_PASS}
DB_NAME=agency

# Server Configuration
PORT=5001
FRONTEND_URL=http://trendycosmeticx.com
NODE_ENV=production

# JWT Secret
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Gemini API Key (optionnel)
GEMINI_API_KEY=

# VITE_API_URL
VITE_API_URL=http://localhost:5001/api
ENVEOF

    chmod 600 .env

    # Étape 11: Création de l'utilisateur système
    echo -e "${GREEN}👤 Étape 11/18: Création de l'utilisateur système...${NC}"
    useradd -r -s /bin/bash -d /opt/textilelaunch textilelaunch 2>/dev/null || true
    chown -R textilelaunch:textilelaunch /opt/textilelaunch

    # Étape 12: Service systemd
    echo -e "${GREEN}⚙️ Étape 12/18: Configuration du service systemd...${NC}"
    cat > /etc/systemd/system/textilelaunch.service <<'SERVICE_EOF'
[Unit]
Description=TextileLaunch Backend API
After=network.target mariadb.service

[Service]
Type=simple
User=textilelaunch
WorkingDirectory=/opt/textilelaunch
Environment=NODE_ENV=production
EnvironmentFile=/opt/textilelaunch/.env
ExecStart=/usr/bin/node /opt/textilelaunch/server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

    # Étape 13: Configuration Nginx
    echo -e "${GREEN}🌐 Étape 13/18: Configuration de Nginx...${NC}"
    cat > /etc/nginx/conf.d/textilelaunch.conf <<'NGINX_EOF'
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
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://textilelaunch_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Cookie support
        proxy_cookie_path / /;
        proxy_set_header Cookie $http_cookie;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

    # Tester la configuration Nginx
    nginx -t

    # Étape 14: Configuration du firewall
    echo -e "${GREEN}🔥 Étape 14/18: Configuration du firewall...${NC}"
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload

    # Étape 15: Démarrer les services
    echo -e "${GREEN}🚀 Étape 15/18: Démarrage des services...${NC}"
    systemctl daemon-reload
    systemctl enable textilelaunch nginx mariadb
    systemctl start mariadb
    sleep 3
    systemctl start textilelaunch
    systemctl start nginx

    # Étape 16: Vérification
    echo -e "${GREEN}🔍 Étape 16/18: Vérification des services...${NC}"
    sleep 5

    if systemctl is-active --quiet textilelaunch; then
        echo -e "${GREEN}✅ Backend: En cours d'exécution${NC}"
    else
        echo -e "${RED}❌ Backend: Erreur${NC}"
        journalctl -u textilelaunch -n 20
    fi

    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx: En cours d'exécution${NC}"
    else
        echo -e "${RED}❌ Nginx: Erreur${NC}"
    fi

    if systemctl is-active --quiet mariadb; then
        echo -e "${GREEN}✅ MariaDB: En cours d'exécution${NC}"
    else
        echo -e "${RED}❌ MariaDB: Erreur${NC}"
    fi

    # Étape 17: Test de l'API
    echo -e "${GREEN}🔍 Étape 17/18: Test de l'API...${NC}"
    sleep 3
    if curl -s http://localhost:5001/api/health > /dev/null; then
        echo -e "${GREEN}✅ API Backend: Accessible${NC}"
    else
        echo -e "${YELLOW}⚠️ API Backend: Vérifiez les logs${NC}"
    fi

    # Étape 18: Résumé
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Déploiement terminé!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 Informations importantes:${NC}"
    echo "  - Application: /opt/textilelaunch"
    echo "  - URL: http://trendycosmeticx.com (ou IP du serveur)"
    echo "  - Login: admin@textile.com"
    echo "  - Password: admin"
    echo ""
    echo -e "${YELLOW}🔐 Mots de passe générés:${NC}"
    echo "  - DB Password: $DB_PASS"
    echo "  - JWT Secret: $JWT_SECRET"
    echo "  - Session Secret: $SESSION_SECRET"
    echo ""
    echo -e "${YELLOW}⚠️ SAUVEZ CES INFORMATIONS!${NC}"
    echo ""
    echo -e "${GREEN}📊 Commandes utiles:${NC}"
    echo "  - Logs backend: journalctl -u textilelaunch -f"
    echo "  - Logs Nginx: journalctl -u nginx -f"
    echo "  - Status: systemctl status textilelaunch"
    echo "  - Redémarrer: systemctl restart textilelaunch"
    echo ""
    echo -e "${GREEN}🔒 SSL (après configuration DNS):${NC}"
    echo "  certbot --nginx -d trendycosmeticx.com -d www.trendycosmeticx.com"
    echo ""
