# Guide de Dépannage - TextileLaunch

## Erreur: "Cannot GET /api/auth/login"

### Problème
Vous voyez l'erreur `Cannot GET /api/auth/login` lorsque vous accédez à `http://76.13.36.165/api/auth/login` dans le navigateur.

### Cause
La route `/api/auth/login` est une route **POST**, pas GET. Quand vous accédez à une URL dans le navigateur, c'est une requête GET, d'où l'erreur.

### Solutions

#### 1. Vérifier que le backend est démarré
qs
```bash
# Vérifier le statut
systemctl status textilelaunch

# Vérifier les logs
journalctl -u textilelaunch -n 50

# Vérifier que le port est ouvert
netstat -tlnp | grep 5001
```

#### 2. Tester l'API backend directement

```bash
# Test de santé
curl http://localhost:5001/api/health

# Devrait retourner: {"status":"ok","message":"TextileLaunch API is running"}

# Test de login (POST)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}'
```

#### 3. Vérifier la configuration Nginx

```bash
# Tester la configuration
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/error.log

# Vérifier que Nginx est en cours d'exécution
systemctl status nginx
```

#### 4. Vérifier que le proxy fonctionne

```bash
# Test depuis le serveur
curl http://localhost/api/health

# Devrait retourner la même chose que http://localhost:5001/api/health
```

#### 5. Redémarrer les services

```bash
# Redémarrer le backend
systemctl restart textilelaunch

# Redémarrer Nginx
systemctl restart nginx

# Vérifier les statuts
systemctl status textilelaunch nginx mariadb
```

### Tests complets

#### Test 1: Backend directement
```bash
# Depuis le serveur
curl http://localhost:5001/api/health
```

#### Test 2: Backend via Nginx
```bash
# Depuis le serveur
curl http://localhost/api/health
```

#### Test 3: Depuis l'extérieur
```bash
# Depuis votre machine locale
curl http://76.13.36.165/api/health
```

#### Test 4: Login (POST)
```bash
# Depuis votre machine locale
curl -X POST http://76.13.36.165/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}'
```

### Problèmes courants

#### Backend ne démarre pas

**Vérifier les logs:**
```bash
journalctl -u textilelaunch -n 100
```

**Problèmes courants:**
- Port 5001 déjà utilisé: `netstat -tlnp | grep 5001`
- Erreur de connexion à la base de données: Vérifier `.env`
- Erreur de syntaxe: Vérifier les logs

**Solution:**
```bash
# Vérifier le fichier .env
cat /opt/textilelaunch/.env

# Tester la connexion à la base de données
mysql -u textilelaunch_db -p agency

# Vérifier que le port est libre
lsof -i :5001
```

#### Nginx ne démarre pas

**Vérifier:**
```bash
# Tester la configuration
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/error.log

# Vérifier les permissions
ls -la /opt/textilelaunch/dist
```

**Solution:**
```bash
# Vérifier que le répertoire dist existe
ls -la /opt/textilelaunch/dist

# Vérifier les permissions
chown -R textilelaunch:textilelaunch /opt/textilelaunch
```

#### Base de données

**Vérifier:**
```bash
# Statut
systemctl status mariadb

# Connexion
mysql -u textilelaunch_db -p agency

# Vérifier les tables
SHOW TABLES;
```

**Solution:**
```bash
# Redémarrer MariaDB
systemctl restart mariadb

# Vérifier les logs
journalctl -u mariadb -n 50
```

### Commandes de diagnostic complètes

```bash
#!/bin/bash
echo "=== Diagnostic TextileLaunch ==="
echo ""

echo "1. Services:"
systemctl status textilelaunch --no-pager -l
systemctl status nginx --no-pager -l
systemctl status mariadb --no-pager -l
echo ""

echo "2. Ports:"
netstat -tlnp | grep -E '5001|80|3306'
echo ""

echo "3. Backend Health:"
curl -s http://localhost:5001/api/health || echo "Backend non accessible"
echo ""

echo "4. Nginx Health:"
curl -s http://localhost/api/health || echo "Nginx non accessible"
echo ""

echo "5. Base de données:"
mysql -u textilelaunch_db -p$(grep DB_PASSWORD /opt/textilelaunch/.env | cut -d'=' -f2) -e "SELECT 1" agency 2>/dev/null && echo "✅ DB accessible" || echo "❌ DB non accessible"
echo ""

echo "6. Fichiers:"
ls -la /opt/textilelaunch/dist | head -5
ls -la /opt/textilelaunch/.env
echo ""

echo "7. Logs récents:"
journalctl -u textilelaunch -n 10 --no-pager
```

Sauvegardez ce script dans `diagnostic.sh`, rendez-le exécutable et exécutez-le:
```bash
chmod +x diagnostic.sh
sudo ./diagnostic.sh
```
