# Déploiement sur Coolify

Ce guide explique comment déployer TextileLaunch sur Coolify avec frontend, backend et base de données.

## Prérequis

- Un compte Coolify configuré
- Un serveur avec Coolify installé
- Accès à votre repository GitHub: `https://github.com/sosinfo212/textilelaunch--1-.git`

## Structure du projet

Le projet est configuré avec 3 services:
- **Frontend**: Application React/Vite (port 80)
- **Backend**: API Node.js/Express (port 5001)
- **Database**: MariaDB (port 3306)

## Déploiement sur Coolify

### Option 1: Déploiement automatique avec docker-compose

1. **Dans Coolify, créez un nouveau projet**
   - Nom: `textilelaunch`
   - Type: `Docker Compose`

2. **Connectez votre repository GitHub**
   - Repository: `sosinfo212/textilelaunch--1-`
   - Branch: `main`

3. **Configurez les variables d'environnement**

   Créez ces variables dans Coolify:

   ```env
   # Database
   MYSQL_ROOT_PASSWORD=your_secure_root_password
   DB_NAME=agency
   DB_USER=textilelaunch_db
   DB_PASSWORD=your_secure_db_password

   # Backend
   JWT_SECRET=your_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   GEMINI_API_KEY=your_gemini_api_key_optional

   # Frontend
   VITE_API_URL=http://your-backend-url/api
   FRONTEND_URL=http://your-frontend-url
   ```

4. **Déployez**
   - Coolify détectera automatiquement `docker-compose.yml`
   - Les services seront créés et démarrés automatiquement

### Option 2: Déploiement service par service

#### 1. Base de données (MariaDB)

1. Créez un nouveau service dans Coolify
2. Type: `Database` → `MariaDB`
3. Version: `10.11`
4. Variables d'environnement:
   ```env
   MYSQL_ROOT_PASSWORD=your_secure_root_password
   MYSQL_DATABASE=agency
   MYSQL_USER=textilelaunch_db
   MYSQL_PASSWORD=your_secure_db_password
   ```
5. Volume: Ajoutez `./database/schema.sql` comme script d'initialisation

#### 2. Backend

1. Créez un nouveau service
2. Type: `Dockerfile`
3. Dockerfile: `Dockerfile.backend`
4. Port: `5001`
5. Variables d'environnement:
   ```env
   DB_HOST=database  # Nom du service database dans Coolify
   DB_PORT=3306
   DB_USER=textilelaunch_db
   DB_PASSWORD=your_secure_db_password
   DB_NAME=agency
   PORT=5001
   NODE_ENV=production
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   GEMINI_API_KEY=your_gemini_key
   ```
6. Healthcheck: `/api/health`

#### 3. Frontend

1. Créez un nouveau service
2. Type: `Dockerfile`
3. Dockerfile: `Dockerfile.frontend`
4. Port: `80`
5. Build arguments:
   ```env
   VITE_API_URL=http://your-backend-url/api
   ```
6. Dépendances: Backend

## Configuration des domaines

### Backend
- Domaine: `api.trendycosmeticx.com` (ou votre sous-domaine)
- Port interne: `5001`

### Frontend
- Domaine: `trendycosmeticx.com` (ou votre domaine principal)
- Port interne: `80`

## Variables d'environnement importantes

### Backend
- `DB_HOST`: Nom du service database (généralement `database` ou l'URL interne)
- `DB_PORT`: `3306`
- `DB_USER`: Utilisateur de la base de données
- `DB_PASSWORD`: Mot de passe de la base de données
- `DB_NAME`: `agency`
- `JWT_SECRET`: Secret pour les tokens JWT (générez avec `openssl rand -base64 64`)
- `SESSION_SECRET`: Secret pour les sessions (générez avec `openssl rand -base64 64`)

### Frontend
- `VITE_API_URL`: URL complète de votre backend API (ex: `https://api.trendycosmeticx.com/api`)

## Initialisation de la base de données

La base de données sera automatiquement initialisée avec le schéma depuis `database/schema.sql` lors du premier démarrage.

Si vous devez l'initialiser manuellement:

```bash
# Se connecter au conteneur database
docker exec -it textilelaunch-db bash

# Importer le schéma
mysql -u root -p agency < /docker-entrypoint-initdb.d/schema.sql
```

## Vérification du déploiement

1. **Backend Health Check**
   ```bash
   curl http://your-backend-url/api/health
   ```
   Devrait retourner: `{"status":"ok","message":"TextileLaunch API is running"}`

2. **Frontend**
   - Ouvrez `http://your-frontend-url` dans votre navigateur
   - Vous devriez voir la page de login

3. **Base de données**
   ```bash
   # Se connecter
   docker exec -it textilelaunch-db mysql -u textilelaunch_db -p agency
   ```

## Login par défaut

- Email: `admin@textile.com`
- Password: `admin`

⚠️ **Changez ce mot de passe après le premier login!**

## Troubleshooting

### Backend ne démarre pas
- Vérifiez les logs: `docker logs textilelaunch-backend`
- Vérifiez que la base de données est accessible
- Vérifiez les variables d'environnement

### Frontend ne charge pas
- Vérifiez que `VITE_API_URL` pointe vers le bon backend
- Vérifiez les logs: `docker logs textilelaunch-frontend`
- Vérifiez que le build s'est bien passé

### Base de données
- Vérifiez que le volume persiste: `docker volume ls`
- Vérifiez les logs: `docker logs textilelaunch-db`
- Vérifiez les variables d'environnement

## Mise à jour

Pour mettre à jour l'application:

1. Poussez les changements sur GitHub
2. Dans Coolify, cliquez sur "Redeploy" pour chaque service
3. Les services seront reconstruits et redémarrés automatiquement

## Support

Pour plus d'informations:
- Documentation Coolify: https://coolify.io/docs
- Repository GitHub: https://github.com/sosinfo212/textilelaunch--1-
