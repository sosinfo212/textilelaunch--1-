# TextileLaunch - Deployment Guide for AlmaLinux 10

This guide explains how to deploy TextileLaunch on AlmaLinux 10.

## Prerequisites

- Fresh AlmaLinux 10 server
- Root or sudo access
- Domain name: **trendycosmeticx.com** (configured by default, can be changed)

## Quick Deployment

### Option 1: Deploy from GitHub (Recommended - Easiest)

**On your AlmaLinux 10 server, download and run the script directly:**

```bash
# Navigate to a temporary directory
cd /tmp

# Download the deployment script from GitHub
curl -O https://raw.githubusercontent.com/sosinfo212/textilelaunch--1-/main/deploy.sh

# Make it executable
chmod +x deploy.sh

# Run the deployment (script will automatically clone from GitHub)
sudo ./deploy.sh
```

**Or clone the repository first:**
```bash
# Clone the repository
git clone https://github.com/sosinfo212/textilelaunch--1-.git
cd textilelaunch--1-

# Make script executable
chmod +x deploy.sh

# Run deployment
sudo ./deploy.sh
```

### Option 2: Deploy from Local Files

**If you have the files locally and want to upload them:**

1. **Upload application files to server**
   ```bash
   # On your local machine
   scp deploy.sh user@your-server:/tmp/
   scp -r . user@your-server:/tmp/textilelaunch
   
   # On server
   cd /tmp/textilelaunch
   chmod +x ../deploy.sh
   ```

2. **Run deployment script**
   ```bash
   # From the application directory
   sudo /tmp/deploy.sh
   
   # Or copy deploy.sh to the application directory first
   cp /tmp/deploy.sh .
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

### Option 3: Custom GitHub Repository

```bash
# Deploy from a different GitHub repository
sudo GITHUB_REPO=https://github.com/user/repo.git GITHUB_BRANCH=main ./deploy.sh
```

### Access the Application

- Open browser: `http://your-server-ip`
- Login with: `admin@textile.com` / `admin`

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Install Dependencies

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y git curl wget mariadb-server mariadb nginx firewalld openssl

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### 2. Setup MySQL

```bash
# Start MariaDB
sudo systemctl enable mariadb
sudo systemctl start mariadb

# Secure MariaDB (set root password)
sudo mysql_secure_installation

# Create database
mysql -u root -p
```

```sql
CREATE DATABASE agency CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'textilelaunch_db'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON agency.* TO 'textilelaunch_db'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Setup Application

```bash
# Create application user
sudo useradd -r -s /bin/bash -d /opt/textilelaunch textilelaunch

# Copy application files
sudo mkdir -p /opt/textilelaunch
sudo cp -r /path/to/application/* /opt/textilelaunch/
sudo chown -R textilelaunch:textilelaunch /opt/textilelaunch

# Install dependencies
cd /opt/textilelaunch
sudo -u textilelaunch npm install --production
sudo -u textilelaunch npm run build
```

### 4. Configure Environment

```bash
# Create .env file
sudo -u textilelaunch nano /opt/textilelaunch/.env
```

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=textilelaunch_db
DB_PASSWORD=your_secure_password
DB_NAME=agency

PORT=5001
FRONTEND_URL=http://localhost:3000
NODE_ENV=production

JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

GEMINI_API_KEY=your_gemini_key_optional
VITE_API_URL=http://localhost:5001/api
```

### 5. Initialize Database

```bash
mysql -u textilelaunch_db -p agency < /opt/textilelaunch/database/schema.sql
```

### 6. Create Systemd Service

```bash
sudo nano /etc/systemd/system/textilelaunch.service
```

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable textilelaunch
sudo systemctl start textilelaunch
```

### 7. Configure Nginx

```bash
sudo nano /etc/nginx/conf.d/textilelaunch.conf
```

```nginx
upstream textilelaunch_backend {
    server localhost:5001;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    root /opt/textilelaunch/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

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
        
        proxy_cookie_path / /;
        proxy_set_header Cookie $http_cookie;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 8. Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 9. SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Service Management

### Check Status
```bash
sudo systemctl status textilelaunch
sudo systemctl status nginx
sudo systemctl status mariadb
```

### View Logs
```bash
# Backend logs
sudo journalctl -u textilelaunch -f

# Nginx logs
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/error.log

# Application logs
sudo tail -f /opt/textilelaunch/logs/*.log
```

### Restart Services
```bash
sudo systemctl restart textilelaunch
sudo systemctl restart nginx
```

## Troubleshooting

### Backend not starting
1. Check logs: `sudo journalctl -u textilelaunch -n 50`
2. Verify .env file: `sudo cat /opt/textilelaunch/.env`
3. Test database connection: `mysql -u textilelaunch_db -p agency`

### Nginx 502 Bad Gateway
1. Check backend is running: `sudo systemctl status textilelaunch`
2. Check backend port: `sudo netstat -tlnp | grep 5001`
3. Check backend logs for errors

### Database connection errors
1. Verify MariaDB is running: `sudo systemctl status mariadb`
2. Check credentials in .env file
3. Test connection: `mysql -u textilelaunch_db -p agency`

### Frontend not loading
1. Check build exists: `ls -la /opt/textilelaunch/dist`
2. Rebuild if needed: `cd /opt/textilelaunch && sudo -u textilelaunch npm run build`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Security Recommendations

1. **Change default admin password** after first login
2. **Use strong database passwords** (generate with `openssl rand -base64 32`)
3. **Enable SSL/HTTPS** with Let's Encrypt
4. **Configure firewall** to only allow necessary ports
5. **Keep system updated**: `sudo dnf update -y`
6. **Set secure file permissions**:
   ```bash
   sudo chmod 600 /opt/textilelaunch/.env
   sudo chown textilelaunch:textilelaunch /opt/textilelaunch/.env
   ```

## Backup

### Database Backup
```bash
# Create backup
mysqldump -u textilelaunch_db -p agency > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u textilelaunch_db -p agency < backup_20240101.sql
```

### Application Backup
```bash
sudo tar -czf textilelaunch_backup_$(date +%Y%m%d).tar.gz /opt/textilelaunch
```

## Updates

To update the application:

```bash
# Stop service
sudo systemctl stop textilelaunch

# Backup current version
sudo cp -r /opt/textilelaunch /opt/textilelaunch.backup

# Update files
cd /opt/textilelaunch
sudo -u textilelaunch git pull  # If using git
# Or copy new files manually

# Update dependencies
sudo -u textilelaunch npm install --production
sudo -u textilelaunch npm run build

# Restart service
sudo systemctl start textilelaunch
```

## Support

For issues:
- Check logs: `sudo journalctl -u textilelaunch -f`
- Verify configuration files
- Check database connectivity
- Review Nginx configuration
