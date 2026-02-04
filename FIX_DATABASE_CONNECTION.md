# Fix: Database Connection Error

## Problème
```
ER_ACCESS_DENIED_NO_PASSWORD_ERROR
Access denied for user 'root'@'localhost'
```

Le backend essaie de se connecter à MySQL avec l'utilisateur `root` sans mot de passe, mais MariaDB refuse cette connexion.

## Solution

### 1. Vérifier le fichier .env

Sur le serveur, vérifiez le fichier `.env` :

```bash
cat /opt/textilelaunch/.env
```

Il doit contenir :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=votre_mot_de_passe_db
DB_NAME=agency
```

**Important:** 
- `DB_USER` ne doit PAS être `root`
- `DB_PASSWORD` doit être le mot de passe de l'utilisateur `textilelaunch_db`

### 2. Si le fichier .env n'existe pas ou est incorrect

Créez ou modifiez le fichier :

```bash
nano /opt/textilelaunch/.env
```

Collez ce contenu (remplacez `votre_mot_de_passe_db` par le vrai mot de passe) :

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=votre_mot_de_passe_db
DB_NAME=agency

# Server Configuration
PORT=5001
FRONTEND_URL=http://trendycosmeticx.com
NODE_ENV=production

# JWT Secret (générez avec: openssl rand -base64 64)
JWT_SECRET=votre_jwt_secret
SESSION_SECRET=votre_session_secret

# Gemini API Key (optionnel)
GEMINI_API_KEY=

# VITE_API_URL
VITE_API_URL=http://localhost:5001/api
```

### 3. Vérifier que l'utilisateur textilelaunch_db existe

```bash
mysql -u root -p
```

Dans MySQL :

```sql
-- Vérifier que l'utilisateur existe
SELECT user, host FROM mysql.user WHERE user = 'textilelaunch_db';

-- Si l'utilisateur n'existe pas, le créer
CREATE USER IF NOT EXISTS 'textilelaunch_db'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_db';
GRANT ALL PRIVILEGES ON agency.* TO 'textilelaunch_db'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Tester la connexion

```bash
# Tester avec les identifiants du .env
mysql -u textilelaunch_db -p agency
# Entrez le mot de passe quand demandé
```

Si ça fonctionne, vous devriez voir le prompt MySQL.

### 5. Vérifier que le service systemd charge le .env

Vérifiez le fichier de service :

```bash
cat /etc/systemd/system/textilelaunch.service
```

Il doit contenir :

```ini
[Service]
EnvironmentFile=/opt/textilelaunch/.env
```

### 6. Redémarrer le service

```bash
systemctl daemon-reload
systemctl restart textilelaunch
systemctl status textilelaunch
```

### 7. Vérifier les logs

```bash
journalctl -u textilelaunch -n 20 --no-pager
```

Vous devriez voir :
```
✅ Database connected successfully
```

Au lieu de l'erreur d'authentification.

### 8. Tester le login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}'
```

## Résumé des commandes

```bash
# 1. Vérifier .env
cat /opt/textilelaunch/.env

# 2. Si nécessaire, créer/modifier .env
nano /opt/textilelaunch/.env

# 3. Vérifier l'utilisateur MySQL
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user = 'textilelaunch_db';"

# 4. Tester la connexion
mysql -u textilelaunch_db -p agency

# 5. Redémarrer
systemctl daemon-reload
systemctl restart textilelaunch

# 6. Vérifier les logs
journalctl -u textilelaunch -n 20 --no-pager
```
