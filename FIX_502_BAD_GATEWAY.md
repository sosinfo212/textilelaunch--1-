# Fix 502 Bad Gateway Error

## Problème

Les requêtes API retournent `502 Bad Gateway`, ce qui signifie que Nginx ne peut pas se connecter au backend.

## Causes possibles

1. Backend n'est pas démarré
2. Backend n'écoute pas sur le port 5001
3. Configuration Nginx incorrecte
4. `server_name` dans Nginx ne correspond pas à l'IP

## Solution

### 1. Vérifier que le backend est démarré

```bash
systemctl status textilelaunch
```

Si arrêté :
```bash
systemctl start textilelaunch
systemctl enable textilelaunch
```

### 2. Vérifier que le backend écoute sur le port 5001

```bash
netstat -tlnp | grep 5001
# ou
ss -tlnp | grep 5001
```

Vous devriez voir quelque chose comme :
```
tcp  0  0 0.0.0.0:5001  0.0.0.0:*  LISTEN  12345/node
```

### 3. Tester le backend directement

```bash
curl http://localhost:5001/api/health
```

Devrait retourner :
```json
{"status":"ok","message":"TextileLaunch API is running"}
```

### 4. Vérifier la configuration Nginx

```bash
cat /etc/nginx/conf.d/textilelaunch.conf
```

La configuration doit inclure :

```nginx
# Upstream backend
upstream textilelaunch_backend {
    server localhost:5001;
}

server {
    listen 80;
    server_name 76.13.36.165 trendycosmeticx.com www.trendycosmeticx.com;
    
    # ... reste de la config
}
```

**Important :** `server_name` doit inclure l'IP `76.13.36.165` ou utiliser `_` pour accepter toutes les requêtes.

### 5. Corriger la configuration Nginx si nécessaire

```bash
sudo nano /etc/nginx/conf.d/textilelaunch.conf
```

Assurez-vous que :
- `server_name` inclut `76.13.36.165` ou utilise `_`
- `upstream textilelaunch_backend` pointe vers `localhost:5001`
- `proxy_pass` utilise `http://textilelaunch_backend`

Exemple de configuration complète :

```nginx
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
```

### 6. Tester la configuration Nginx

```bash
nginx -t
```

Si erreur, corrigez-la avant de continuer.

### 7. Redémarrer Nginx

```bash
systemctl restart nginx
```

### 8. Vérifier les logs

```bash
# Logs Nginx
tail -f /var/log/nginx/error.log

# Logs backend
journalctl -u textilelaunch -f
```

### 9. Tester

```bash
# Test backend directement
curl http://localhost:5001/api/health

# Test via Nginx
curl http://localhost/api/health
curl http://76.13.36.165/api/health
```

## Script de diagnostic automatique

Exécutez le script `fix-nginx-502.sh` :

```bash
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/fix-nginx-502.sh
chmod +x fix-nginx-502.sh
sudo ./fix-nginx-502.sh
```

## Erreur 404 pour /index.css

Le fichier `/index.css` n'existe pas. C'est normal car Tailwind est chargé via CDN.

**Solution :** Supprimez la ligne `<link rel="stylesheet" href="/index.css">` de `index.html` (déjà fait dans le code).

## Résumé des commandes

```bash
# 1. Vérifier backend
systemctl status textilelaunch
curl http://localhost:5001/api/health

# 2. Vérifier Nginx
systemctl status nginx
cat /etc/nginx/conf.d/textilelaunch.conf
nginx -t

# 3. Corriger si nécessaire
sudo nano /etc/nginx/conf.d/textilelaunch.conf
# Ajouter 76.13.36.165 dans server_name

# 4. Redémarrer
systemctl restart textilelaunch
systemctl restart nginx

# 5. Tester
curl http://76.13.36.165/api/health
```
