# Fix Backend Startup Issues

## Problème

Le backend ne démarre pas ou n'écoute pas sur le port 5001.

## Diagnostic

### 1. Vérifier les logs

```bash
journalctl -u textilelaunch -n 50 --no-pager
```

Cherchez les erreurs comme :
- Erreurs de connexion à la base de données
- Erreurs de syntaxe JavaScript
- Port déjà utilisé
- Fichiers manquants

### 2. Vérifier le fichier .env

```bash
cat /opt/textilelaunch/.env
```

Assurez-vous que :
- `DB_USER=textilelaunch_db` (pas root)
- `DB_PASSWORD` est défini
- `PORT=5001`

### 3. Vérifier le service systemd

```bash
cat /etc/systemd/system/textilelaunch.service
```

Assurez-vous que :
- `EnvironmentFile=/opt/textilelaunch/.env` est présent
- `ExecStart=/usr/bin/node /opt/textilelaunch/server/index.js` est correct
- `User=textilelaunch` est défini

### 4. Vérifier Node.js

```bash
which node
node --version
```

### 5. Vérifier les permissions

```bash
ls -la /opt/textilelaunch | head -5
```

Le propriétaire doit être `textilelaunch`.

## Solutions

### Solution 1: Corriger le service systemd

Si `EnvironmentFile` est manquant :

```bash
sudo nano /etc/systemd/system/textilelaunch.service
```

Ajoutez sous `[Service]` :
```ini
[Service]
Type=simple
User=textilelaunch
WorkingDirectory=/opt/textilelaunch
EnvironmentFile=/opt/textilelaunch/.env    # <-- AJOUTEZ CETTE LIGNE
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/textilelaunch/server/index.js
...
```

Puis :
```bash
systemctl daemon-reload
systemctl restart textilelaunch
```

### Solution 2: Corriger les permissions

```bash
chown -R textilelaunch:textilelaunch /opt/textilelaunch
```

### Solution 3: Tester manuellement

```bash
cd /opt/textilelaunch
sudo -u textilelaunch node server/index.js
```

Si ça fonctionne manuellement mais pas via systemd, le problème est dans la configuration du service.

### Solution 4: Vérifier que le port n'est pas utilisé

```bash
netstat -tlnp | grep 5001
lsof -i :5001
```

Si le port est utilisé par un autre processus, tuez-le ou changez le port.

### Solution 5: Reconstruire le frontend

Si le build est manquant :

```bash
cd /opt/textilelaunch
npm run build
chown -R textilelaunch:textilelaunch /opt/textilelaunch
```

## Correction de Nginx

Même si le backend ne démarre pas, corrigez Nginx pour inclure l'IP :

```bash
sudo nano /etc/nginx/conf.d/textilelaunch.conf
```

Changez :
```nginx
server_name trendycosmeticx.com www.trendycosmeticx.com;
```

En :
```nginx
server_name 76.13.36.165 trendycosmeticx.com www.trendycosmeticx.com;
```

Puis :
```bash
nginx -t
systemctl restart nginx
```

## Script automatique

Exécutez le script de diagnostic :

```bash
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/fix-backend-startup.sh
chmod +x fix-backend-startup.sh
sudo ./fix-backend-startup.sh
```

## Commandes utiles

```bash
# Voir les logs en temps réel
journalctl -u textilelaunch -f

# Vérifier le statut
systemctl status textilelaunch

# Redémarrer
systemctl restart textilelaunch

# Vérifier le port
netstat -tlnp | grep 5001

# Tester le backend
curl http://localhost:5001/api/health
```
