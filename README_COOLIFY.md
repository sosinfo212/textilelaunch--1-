# Déploiement Coolify - Guide Rapide

## 🚀 Déploiement en 3 étapes

### 1. Préparer le repository

Assurez-vous que tous les fichiers sont poussés sur GitHub:
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `docker-compose.yml`
- `nginx.conf`
- `coolify.yml`

### 2. Dans Coolify

#### Option A: Docker Compose (Recommandé)

1. **Nouveau projet** → **Docker Compose**
2. **Connecter GitHub**: `sosinfo212/textilelaunch--1-`
3. **Fichier**: `docker-compose.yml`
4. **Variables d'environnement** (voir ci-dessous)
5. **Déployer**

#### Option B: Services séparés

Créez 3 services:

**Service 1: Database**
- Type: Database → MariaDB
- Version: 10.11
- Variables:
  ```
  MYSQL_ROOT_PASSWORD=your_secure_password
  MYSQL_DATABASE=agency
  MYSQL_USER=textilelaunch_db
  MYSQL_PASSWORD=your_db_password
  ```

**Service 2: Backend**
- Type: Dockerfile
- Dockerfile: `Dockerfile.backend`
- Port: 5001
- Variables: (voir section complète)

**Service 3: Frontend**
- Type: Dockerfile
- Dockerfile: `Dockerfile.frontend`
- Port: 80
- Build args: `VITE_API_URL=https://your-backend-url/api`

### 3. Variables d'environnement

#### Backend
```env
DB_HOST=database
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=your_secure_password
DB_NAME=agency
PORT=5001
NODE_ENV=production
JWT_SECRET=generate_with_openssl_rand_base64_64
SESSION_SECRET=generate_with_openssl_rand_base64_64
GEMINI_API_KEY=your_key_optional
FRONTEND_URL=https://your-frontend-url
```

#### Frontend (Build args)
```env
VITE_API_URL=https://your-backend-url/api
```

## 🔗 Configuration des domaines

- **Frontend**: `trendycosmeticx.com`
- **Backend**: `api.trendycosmeticx.com` (optionnel, ou utilisez l'URL interne)

## ✅ Vérification

1. Backend: `curl https://api.trendycosmeticx.com/api/health`
2. Frontend: Ouvrir `https://trendycosmeticx.com`
3. Login: `admin@textile.com` / `admin`

## 📚 Documentation complète

Voir `COOLIFY_DEPLOYMENT.md` pour plus de détails.
