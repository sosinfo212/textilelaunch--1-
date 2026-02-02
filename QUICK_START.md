# Quick Start - Déploiement sur AlmaLinux 10

## Étape 1: Se connecter au serveur

```bash
ssh user@your-server-ip
# ou
ssh root@your-server-ip
```

## Étape 2: Télécharger et exécuter le script

**Option A: Dans /tmp (recommandé)**
```bash
cd /tmp
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

**Option B: Dans /root**
```bash
cd /root
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

**Option C: Dans votre répertoire home**
```bash
cd ~
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

## Étape 3: Attendre la fin du déploiement

Le script va :
- Installer toutes les dépendances
- Configurer MariaDB
- Cloner l'application depuis GitHub
- Installer les dépendances npm
- Builder le frontend
- Configurer Nginx
- Démarrer tous les services

## Étape 4: Accéder à l'application

- URL: `http://trendycosmeticx.com` (ou l'IP de votre serveur si DNS pas encore configuré)
- Login: `admin@textile.com` / `admin`

## Étape 5: Configurer SSL (après DNS)

```bash
sudo certbot --nginx -d trendycosmeticx.com -d www.trendycosmeticx.com
```

## Notes importantes

- Le script peut être placé **n'importe où** sur le serveur
- L'application sera installée dans `/opt/textilelaunch`
- Vous pouvez supprimer `deploy.sh` après le déploiement
- Tous les mots de passe générés seront affichés à la fin - **SAVEZ-LES !**
