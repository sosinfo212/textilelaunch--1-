# Déploiement Complet sur AlmaLinux - Commandes depuis Zéro

Ce guide vous donne toutes les commandes nécessaires pour déployer TextileLaunch sur un serveur AlmaLinux 10 vierge.

## Prérequis

- Serveur AlmaLinux 10 (frais installé)
- Accès root ou sudo
- Connexion SSH au serveur

## Étape 1: Se connecter au serveur

```bash
ssh root@your-server-ip
# ou
ssh user@your-server-ip
```

## Étape 2: Mettre à jour le système

```bash
# Mettre à jour les packages
dnf update -y

# Installer EPEL repository
dnf install -y epel-release
```

## Étape 3: Installer toutes les dépendances

```bash
# Installer les packages système
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
```

## Étape 4: Installer Node.js 20

```bash
# Ajouter le repository NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# Installer Node.js
dnf install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

## Étape 5: Configurer MariaDB

```bash
# Activer et démarrer MariaDB
systemctl enable mariadb
systemctl start mariadb

# Attendre que MariaDB soit prêt
sleep 5

# Sécuriser MariaDB (optionnel mais recommandé)
mysql_secure_installation
# Répondez aux questions:
# - Set root password? Y
# - Remove anonymous users? Y
# - Disallow root login remotely? Y
# - Remove test database? Y
# - Reload privilege tables? Y
```

## Étape 6: Créer la base de données

```bash
# Se connecter à MariaDB (remplacez 'your_root_password' par votre mot de passe)
mysql -u root -p

# Dans MySQL, exécutez:
```

```sql
CREATE DATABASE agency CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'textilelaunch_db'@'localhost' IDENTIFIED BY 'VotreMotDePasseSecurise123!';
GRANT ALL PRIVILEGES ON agency.* TO 'textilelaunch_db'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Note:** Remplacez `VotreMotDePasseSecurise123!` par un mot de passe sécurisé.

## Étape 7: Cloner l'application depuis GitHub

```bash
# Aller dans /opt
cd /opt

# Cloner le repository
git clone https://github.com/sosinfo212/textilelaunch--1-.git textilelaunch

# Aller dans le répertoire
cd textilelaunch
```

## Étape 8: Installer les dépendances Node.js

```bash
# Installer les dépendances
npm install

# Vérifier que node_modules est créé
ls -la node_modules | head -5
```

## Étape 9: Builder le frontend

```bash
# Builder l'application
npm run build

# Vérifier que dist est créé
ls -la dist | head -5
```

## Étape 10: Initialiser la base de données

```bash
# Importer le schéma (remplacez le mot de passe)
mysql -u textilelaunch_db -p agency < database/schema.sql
# Entrez le mot de passe que vous avez créé à l'étape 6
```

## Étape 11: Créer le fichier .env

```bash
# Créer le fichier .env
nano .env
```

Collez ce contenu (remplacez les valeurs):

```env
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

# JWT Secret (générez avec: openssl rand -base64 64)
JWT_SECRET=VotreJWTSecretTresLongEtSecurise
SESSION_SECRET=VotreSessionSecretTresLongEtSecurise

# Gemini API Key (optionnel)
GEMINI_API_KEY=

# VITE_API_URL (pour le build)
VITE_API_URL=http://localhost:5001/api
```

**Générer des secrets sécurisés:**
```bash
openssl rand -base64 64  # Pour JWT_SECRET
openssl rand -base64 64  # Pour SESSION_SECRET
```
[root@srv1323693 textilelaunch]# openssl rand -base64 64  # Pour JWT_SECRET
openssl rand -base64 64  # Pour SESSION_SECRET
+drz75LSOdhQourf8MORbUwZujXAHurX/kcONsEiQXqZsRhqBnLLvQXUhlEYz4R2
duEFX71MAIgYv3Ubvs9xgg==
Q3BbnJIfpqHoZhwWZihVj2q8+je41dHABhRBQQW9o3cBRQ+HV3BRWxXa15TLYqsQ
InGYpDQHwNhr7tMQsHhmEg==

Sauvegardez avec `Ctrl+O`, puis `Enter`, puis `Ctrl+X`.

## Étape 12: Créer l'utilisateur système

```bash
# Créer l'utilisateur pour l'application
useradd -r -s /bin/bash -d /opt/textilelaunch textilelaunch

# Donner la propriété des fichiers
chown -R textilelaunch:textilelaunch /opt/textilelaunch
```

## Étape 13: Créer le service systemd pour le backend

```bash
# Créer le fichier de service
nano /etc/systemd/system/textilelaunch.service
```

Collez ce contenu:

```ini
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
```

Sauvegardez et quittez.

## Étape 14: Configurer Nginx

```bash
# Créer la configuration Nginx
nano /etc/nginx/conf.d/textilelaunch.conf
```

Collez ce contenu:

```nginx
# Upstream backend
upstream textilelaunch_backend {
    server localhost:5001;
}

# Frontend (served by Nginx)
server {
    listen 80;
    server_name trendycosmeticx.com www.trendycosmeticx.com;

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
```

Sauvegardez et quittez.

**Tester la configuration Nginx:**
```bash
nginx -t
```

## Étape 15: Configurer le firewall

```bash
# Activer et démarrer firewalld
systemctl enable firewalld
systemctl start firewalld

# Autoriser HTTP et HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Recharger le firewall
firewall-cmd --reload
```

## Étape 16: Démarrer les services

```bash
# Recharger systemd
systemctl daemon-reload

# Activer les services
systemctl enable textilelaunch
systemctl enable nginx
systemctl enable mariadb

# Démarrer les services
systemctl start mariadb
systemctl start textilelaunch
systemctl start nginx
```

## Étape 17: Vérifier que tout fonctionne
    
```bash
# Vérifier le statut des services
systemctl status textilelaunch
systemctl status nginx
systemctl status mariadb

# Vérifier que le backend répond
curl http://localhost:5001/api/health

# Vérifier que Nginx répond
curl http://localhost
```

## Étape 18: Configurer SSL (après DNS)

**Important:** Configurez d'abord votre DNS:
- A Record: `trendycosmeticx.com` → IP de votre serveur
- A Record: `www.trendycosmeticx.com` → IP de votre serveur

**Ensuite, configurez SSL:**
```bash
# Obtenir le certificat SSL
certbot --nginx -d trendycosmeticx.com -d www.trendycosmeticx.com

# Vérifier le renouvellement automatique
systemctl status certbot.timer
```

## Commandes utiles

### Voir les logs
```bash
# Logs backend
journalctl -u textilelaunch -f

# Logs Nginx
journalctl -u nginx -f

# Logs MariaDB
journalctl -u mariadb -f
```

### Redémarrer les services
```bash
systemctl restart textilelaunch
systemctl restart nginx
systemctl restart mariadb
```

### Arrêter les services
```bash
systemctl stop textilelaunch
systemctl stop nginx
systemctl stop mariadb
```

### Vérifier les ports
```bash
netstat -tlnp | grep -E '5001|80|3306'
```

## Accès à l'application

- **URL:** `http://trendycosmeticx.com` (ou IP du serveur si DNS pas configuré)
- **Login:** `admin@textile.com`
- **Password:** `admin`

⚠️ **Changez le mot de passe admin après le premier login!**

## Dépannage

### Backend ne démarre pas
```bash
# Vérifier les logs
journalctl -u textilelaunch -n 50

# Vérifier le fichier .env
cat /opt/textilelaunch/.env

# Tester la connexion à la base de données
mysql -u textilelaunch_db -p agency
```

### Nginx ne démarre pas
```bash
# Tester la configuration
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/error.log
```

### Base de données
```bash
# Vérifier que MariaDB est en cours d'exécution
systemctl status mariadb

# Se connecter
mysql -u root -p

# Vérifier les bases de données
SHOW DATABASES;

# Vérifier les utilisateurs
SELECT user, host FROM mysql.user;
```

## Script complet (copier-coller)

Si vous préférez tout faire d'un coup, voici un script complet:

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement de TextileLaunch sur AlmaLinux 10"

# Mise à jour
echo "📦 Mise à jour du système..."
dnf update -y
dnf install -y epel-release

# Installation des dépendances
echo "📦 Installation des dépendances..."
dnf install -y git curl wget mariadb-server mariadb nginx firewalld openssl certbot python3-certbot-nginx

# Node.js
echo "📦 Installation de Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# MariaDB
echo "🗄️ Configuration de MariaDB..."
systemctl enable mariadb
systemctl start mariadb
sleep 5

# Créer la base de données (vous devrez entrer le mot de passe)
echo "🗄️ Création de la base de données..."
read -sp "Mot de passe root MariaDB: " MYSQL_ROOT_PASS
read -sp "Mot de passe utilisateur DB: " DB_PASS

mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS agency CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'textilelaunch_db'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON agency.* TO 'textilelaunch_db'@'localhost';
FLUSH PRIVILEGES;
EOF

# Cloner l'application
echo "📥 Clonage de l'application..."
cd /opt
git clone https://github.com/sosinfo212/textilelaunch--1-.git textilelaunch
cd textilelaunch

# Installer les dépendances
echo "📦 Installation des dépendances npm..."
npm install

# Builder
echo "🔨 Build du frontend..."
npm run build

# Initialiser la base de données
echo "🗄️ Initialisation de la base de données..."
mysql -u textilelaunch_db -p"$DB_PASS" agency < database/schema.sql

# Créer .env (vous devrez le compléter)
echo "⚙️ Création du fichier .env..."
cat > .env <<ENVEOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=$DB_PASS
DB_NAME=agency
PORT=5001
FRONTEND_URL=http://trendycosmeticx.com
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
GEMINI_API_KEY=
VITE_API_URL=http://localhost:5001/api
ENVEOF

# Utilisateur système
echo "👤 Création de l'utilisateur..."
useradd -r -s /bin/bash -d /opt/textilelaunch textilelaunch || true
chown -R textilelaunch:textilelaunch /opt/textilelaunch

# Service systemd
echo "⚙️ Configuration du service systemd..."
cat > /etc/systemd/system/textilelaunch.service <<EOF
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
EOF

# Nginx
echo "🌐 Configuration de Nginx..."
cat > /etc/nginx/conf.d/textilelaunch.conf <<NGINXEOF
upstream textilelaunch_backend {
    server localhost:5001;
}

server {
    listen 80;
    server_name trendycosmeticx.com www.trendycosmeticx.com;
    root /opt/textilelaunch/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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
        proxy_cookie_path / /;
        proxy_set_header Cookie \$http_cookie;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Firewall
echo "🔥 Configuration du firewall..."
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Démarrer les services
echo "🚀 Démarrage des services..."
systemctl daemon-reload
systemctl enable textilelaunch nginx mariadb
systemctl start mariadb
sleep 3
systemctl start textilelaunch
systemctl start nginx

echo "✅ Déploiement terminé!"
echo ""
echo "📋 Informations:"
echo "  - Application: /opt/textilelaunch"
echo "  - URL: http://trendycosmeticx.com"
echo "  - Login: admin@textile.com / admin"
echo ""
echo "🔍 Vérification:"
echo "  systemctl status textilelaunch"
echo "  systemctl status nginx"
echo "  curl http://localhost:5001/api/health"
```

Sauvegardez ce script dans un fichier `deploy-complete.sh`, rendez-le exécutable et exécutez-le:

```bash
chmod +x deploy-complete.sh
sudo ./deploy-complete.sh
```

## Résumé

Après avoir exécuté toutes ces commandes, votre application sera:
- ✅ Installée dans `/opt/textilelaunch`
- ✅ Accessible sur `http://trendycosmeticx.com`
- ✅ Backend sur le port 5001
- ✅ Base de données MariaDB configurée
- ✅ Nginx configuré comme reverse proxy
- ✅ Services systemd configurés pour le démarrage automatique
