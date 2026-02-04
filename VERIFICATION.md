# Vérification - Backend Fonctionnel ✅

## Statut actuel

D'après les logs, le backend fonctionne correctement :

```
✅ Database connected successfully
🚀 Server running on http://0.0.0.0:5001
📡 Accessible from: http://localhost:5001
🌐 Frontend URL: http://trendycosmeticx.com
```

## Tests à effectuer

### 1. Test du login (depuis le serveur)

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}'
```

**Résultat attendu :**
```json
{
  "user": {
    "id": "usr_admin",
    "email": "admin@textile.com",
    "name": "Admin Vendeur",
    "role": "admin"
  }
}
```

### 2. Test du login (depuis l'extérieur)

```bash
curl -X POST http://76.13.36.165/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@textile.com","password":"admin"}'
```

### 3. Test de l'API health

```bash
curl http://localhost:5001/api/health
```

**Résultat attendu :**
```json
{
  "status": "ok",
  "message": "TextileLaunch API is running"
}
```

### 4. Test via Nginx

```bash
curl http://localhost/api/health
curl http://76.13.36.165/api/health
```

### 5. Accès au frontend

Ouvrez dans votre navigateur :
- `http://76.13.36.165` (ou `http://trendycosmeticx.com` si DNS configuré)

Vous devriez voir la page de login.

## Vérification des services

```bash
# Statut des services
systemctl status textilelaunch
systemctl status nginx
systemctl status mariadb

# Tous doivent être "active (running)"
```

## Vérification des ports

```bash
netstat -tlnp | grep -E '5001|80|3306'
```

Vous devriez voir :
- Port 5001 : node (backend)
- Port 80 : nginx
- Port 3306 : mariadb

## Logs en temps réel

```bash
# Backend
journalctl -u textilelaunch -f

# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Prochaines étapes

1. ✅ Backend fonctionnel
2. ✅ Base de données connectée
3. ⏳ Tester le login
4. ⏳ Vérifier que le frontend charge correctement
5. ⏳ Configurer SSL (après DNS)

## Résolution des problèmes

Si le login ne fonctionne pas :

1. Vérifier les logs :
   ```bash
   journalctl -u textilelaunch -n 50 --no-pager
   ```

2. Vérifier que l'utilisateur admin existe :
   ```bash
   mysql -u textilelaunch_db -p agency
   SELECT * FROM users WHERE email = 'admin@textile.com';
   ```

3. Vérifier la table sessions :
   ```bash
   mysql -u textilelaunch_db -p agency
   SHOW TABLES LIKE 'sessions';
   ```

## Notes

- Le warning sur MemoryStore est normal en développement, mais vous pouvez l'ignorer pour l'instant
- Les logs montrent que les requêtes sont bien traitées
- La connexion à la base de données fonctionne
