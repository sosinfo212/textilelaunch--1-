#!/bin/bash

# TextileLaunch Deployment Script for AlmaLinux 10
# This script installs and configures the application on a fresh AlmaLinux 10 server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="textilelaunch"
APP_USER="textilelaunch"
APP_DIR="/opt/${APP_NAME}"
SERVICE_USER="textilelaunch"
DB_NAME="agency"
DB_USER="textilelaunch_db"
NODE_VERSION="20"  # Node.js LTS version
FRONTEND_PORT="3000"
BACKEND_PORT="5001"
DOMAIN_NAME="${DOMAIN_NAME:-trendycosmeticx.com}"

# GitHub repository (optional - can be overridden)
GITHUB_REPO="${GITHUB_REPO:-https://github.com/sosinfo212/textilelaunch--1-.git}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_info "Starting deployment of ${APP_NAME}..."

# Step 1: Update system and install EPEL repository
print_info "Updating system packages..."
dnf update -y

print_info "Installing EPEL repository..."
dnf install -y epel-release

# Step 2: Install all required system packages
print_info "Installing required system packages..."
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

# Step 3: Install Node.js using NodeSource repository
print_info "Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    print_info "Adding NodeSource repository..."
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
    print_info "Installing Node.js and npm..."
    dnf install -y nodejs
    print_info "Node.js installed: $(node --version)"
    print_info "npm installed: $(npm --version)"
else
    print_warn "Node.js is already installed: $(node --version)"
    print_warn "npm version: $(npm --version)"
fi

# Verify Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Node.js installation failed!"
    exit 1
fi

# Step 4: Create application user and setup directories
print_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
    print_info "User $APP_USER created"
else
    print_warn "User $APP_USER already exists"
fi

# Create necessary directories
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"
mkdir -p "/var/log/${APP_NAME}"

# Step 5: Start and enable MySQL
print_info "Configuring MySQL..."
systemctl enable mariadb
systemctl start mariadb

# Wait for MySQL to be ready
sleep 5

# Get MySQL root password (if set) or generate one
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    print_warn "MYSQL_ROOT_PASSWORD not set. You'll need to set MySQL root password manually."
    print_warn "Run: mysql_secure_installation"
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
    print_info "Generated MySQL root password: $MYSQL_ROOT_PASSWORD"
    print_warn "Save this password! You'll need it for database setup."
fi

# Step 6: Setup database
print_info "Setting up database..."
DB_PASSWORD="VotreMotDePasseSecurise123!"
print_info "Database password set to: VotreMotDePasseSecurise123!"

# Try to create database with root password, or prompt for password
print_info "Creating database and user..."
if mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF 2>/dev/null; then
    CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
    FLUSH PRIVILEGES;
EOF
    print_info "Database ${DB_NAME} and user ${DB_USER} created successfully"
elif mysql -u root <<EOF 2>/dev/null; then
    CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
    FLUSH PRIVILEGES;
EOF
    print_info "Database ${DB_NAME} and user ${DB_USER} created (no root password)"
else
    print_error "Failed to create database. You may need to set MySQL root password manually."
    print_warn "Run: mysql_secure_installation"
    print_warn "Then create database manually:"
    echo "  CREATE DATABASE ${DB_NAME};"
    echo "  CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
    echo "  GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
    exit 1
fi

print_info "Database ${DB_NAME} and user ${DB_USER} created"
print_warn "Database password: ${DB_PASSWORD} (save this!)"

# Step 7: Setup application directory and files
print_info "Setting up application directory..."
if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
    print_warn "Directory $APP_DIR already exists with files. Backing up..."
    BACKUP_DIR="${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$APP_DIR" "$BACKUP_DIR"
    print_info "Backup created at: $BACKUP_DIR"
fi

# Create fresh directory
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

# Determine source: GitHub or local files
USE_GITHUB=false
if [ -n "$DEPLOY_FROM_GITHUB" ] && [ "$DEPLOY_FROM_GITHUB" = "true" ]; then
    USE_GITHUB=true
    print_info "DEPLOY_FROM_GITHUB=true - will clone from GitHub"
elif [ ! -f "package.json" ]; then
    # If no package.json in current directory, automatically use GitHub
    print_warn "package.json not found in current directory"
    print_info "Automatically switching to GitHub deployment: $GITHUB_REPO"
    USE_GITHUB=true
fi

if [ "$USE_GITHUB" = true ]; then
    print_info "Cloning application from GitHub..."
    print_info "Repository: $GITHUB_REPO"
    print_info "Branch: $GITHUB_BRANCH"
    
    # Clone repository to temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    if git clone -b "$GITHUB_BRANCH" "$GITHUB_REPO" app_source 2>/dev/null; then
        print_info "Repository cloned successfully"
        cd app_source
        
        # Copy files to application directory
        if command -v rsync &> /dev/null; then
            rsync -av --progress \
                --exclude='node_modules' \
                --exclude='.git' \
                --exclude='dist' \
                --exclude='.env' \
                --exclude='*.log' \
                --exclude='.DS_Store' \
                . "$APP_DIR/" 2>/dev/null
        else
            find . -maxdepth 1 ! -name '.' ! -name 'node_modules' ! -name '.git' ! -name 'dist' ! -name '.env' ! -name '*.log' -exec cp -r {} "$APP_DIR/" \;
        fi
        
        # Cleanup
        cd /
        rm -rf "$TEMP_DIR"
        print_info "Application files copied from GitHub"
    else
        print_error "Failed to clone from GitHub!"
        print_warn "Please check:"
        print_warn "  - Internet connection"
        print_warn "  - GitHub repository URL: $GITHUB_REPO"
        print_warn "  - Branch: $GITHUB_BRANCH"
        print_warn "  - Repository is public or credentials are set"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
else
    # Copy from local directory
    print_info "Copying application files from current directory..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in current directory!"
        print_error "Current directory: $(pwd)"
        print_error ""
        print_error "Options:"
        print_error "  1. Run from application directory: cd /path/to/textilelaunch && sudo ./deploy.sh"
        print_error "  2. Clone from GitHub: sudo DEPLOY_FROM_GITHUB=true ./deploy.sh"
        exit 1
    fi
    
    # Copy all files except node_modules, .git, and other unnecessary files
    if command -v rsync &> /dev/null; then
        rsync -av --progress \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='.gitignore' \
            --exclude='dist' \
            --exclude='.env' \
            --exclude='*.log' \
            --exclude='.DS_Store' \
            --exclude='*.swp' \
            --exclude='*.swo' \
            . "$APP_DIR/" 2>/dev/null || {
            print_warn "rsync failed, using cp..."
            find . -maxdepth 1 ! -name '.' ! -name 'node_modules' ! -name '.git' ! -name 'dist' ! -name '.env' ! -name '*.log' -exec cp -r {} "$APP_DIR/" \;
        }
    else
        print_warn "rsync not available, using cp..."
        find . -maxdepth 1 ! -name '.' ! -name 'node_modules' ! -name '.git' ! -name 'dist' ! -name '.env' ! -name '*.log' -exec cp -r {} "$APP_DIR/" \;
    fi
    print_info "Application files copied from local directory"
fi

# Set ownership
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
print_info "Application directory setup complete"

# Step 8: Install Node.js dependencies
print_info "Installing Node.js dependencies..."
cd "$APP_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found in $APP_DIR!"
    exit 1
fi

print_info "Running npm install (this may take a few minutes)..."
sudo -u "$APP_USER" npm install --production --no-audit --no-fund || {
    print_error "npm install failed!"
    print_warn "Trying with full dependencies..."
    sudo -u "$APP_USER" npm install --no-audit --no-fund
}

# Verify installation
if [ ! -d "node_modules" ]; then
    print_error "node_modules directory not created. Installation may have failed."
    exit 1
fi

print_info "Node.js dependencies installed successfully"

# Step 9: Build frontend
print_info "Building frontend (this may take a few minutes)..."
sudo -u "$APP_USER" npm run build || {
    print_error "Frontend build failed!"
    print_warn "Check if all dependencies are installed correctly"
    exit 1
}

if [ ! -d "dist" ]; then
    print_error "dist directory not created. Build may have failed."
    exit 1
fi

print_info "Frontend built successfully"

# Step 10: Create .env file
print_info "Creating .env file..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Server Configuration
PORT=${BACKEND_PORT}
FRONTEND_URL=http://localhost:${FRONTEND_PORT}
NODE_ENV=production

# JWT Secret (generate a secure one)
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Gemini API Key (optional - can be set per user in settings)
GEMINI_API_KEY=

# VITE_API_URL (for build)
VITE_API_URL=http://localhost:${BACKEND_PORT}/api
EOF
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    print_info ".env file created"
else
    print_warn ".env file already exists. Please update it manually with database credentials."
fi

# Step 11: Initialize database schema
print_info "Initializing database schema..."
if [ -f "$APP_DIR/database/schema.sql" ]; then
    # Import schema, ignoring errors for existing indexes/tables (safe to ignore)
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$APP_DIR/database/schema.sql" 2>&1 | grep -v "Duplicate key name" | grep -v "already exists" | grep -v "Duplicate entry" | grep -i error; then
        print_warn "Some tables/indexes already exist (normal if database was partially initialized)"
    fi
    print_info "Database schema initialized"
else
    print_warn "schema.sql not found. Please initialize database manually."
fi

# Step 12: Create systemd service for backend
print_info "Creating systemd service..."
cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=TextileLaunch Backend API
After=network.target mariadb.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Step 13: Configure Nginx
print_info "Configuring Nginx..."
cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<EOF
# Upstream backend
upstream textilelaunch_backend {
    server localhost:${BACKEND_PORT};
}

# Frontend (served by Nginx)
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    root ${APP_DIR}/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
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
        
        # Cookie support
        proxy_cookie_path / /;
        proxy_set_header Cookie \$http_cookie;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Step 14: Configure firewall
print_info "Configuring firewall..."
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Step 15: Enable and start services
print_info "Starting services..."
systemctl daemon-reload

# Enable services
systemctl enable "${APP_NAME}" || print_error "Failed to enable ${APP_NAME} service"
systemctl enable nginx || print_error "Failed to enable nginx"
systemctl enable mariadb || print_error "Failed to enable mariadb"

# Start MariaDB if not running
if ! systemctl is-active --quiet mariadb; then
    print_info "Starting MariaDB..."
    systemctl start mariadb
    sleep 3
fi

# Start backend service
print_info "Starting backend service..."
systemctl start "${APP_NAME}" || print_error "Failed to start ${APP_NAME}"

# Start Nginx
print_info "Starting Nginx..."
systemctl start nginx || print_error "Failed to start nginx"

# Step 16: Check service status
print_info "Checking service status..."
sleep 5

if systemctl is-active --quiet "${APP_NAME}"; then
    print_info "✅ Backend service is running"
else
    print_error "❌ Backend service failed to start"
    print_warn "Check logs: journalctl -u ${APP_NAME} -n 50"
    print_warn "Common issues:"
    print_warn "  - Database connection failed (check .env file)"
    print_warn "  - Port already in use"
    print_warn "  - Missing dependencies"
fi

if systemctl is-active --quiet nginx; then
    print_info "✅ Nginx is running"
else
    print_error "❌ Nginx failed to start"
    print_warn "Check logs: journalctl -u nginx -n 50"
    print_warn "Check config: nginx -t"
fi

if systemctl is-active --quiet mariadb; then
    print_info "✅ MySQL is running"
else
    print_error "❌ MySQL failed to start"
    print_warn "Check logs: journalctl -u mariadb -n 50"
fi

# Summary
echo ""
print_info "=========================================="
print_info "Deployment completed!"
print_info "=========================================="
echo ""
print_info "Application Details:"
echo "  - Application directory: ${APP_DIR}"
echo "  - Application user: ${APP_USER}"
echo "  - Backend port: ${BACKEND_PORT}"
echo "  - Frontend: Served by Nginx on port 80"
echo ""
print_info "Database Details:"
echo "  - Database: ${DB_NAME}"
echo "  - Database user: ${DB_USER}"
echo "  - Database password: ${DB_PASSWORD}"
echo ""
print_warn "IMPORTANT: Save these credentials!"
echo ""
print_info "Service Management:"
echo "  - Backend status: systemctl status ${APP_NAME}"
echo "  - Backend logs: journalctl -u ${APP_NAME} -f"
echo "  - Nginx status: systemctl status nginx"
echo "  - Nginx logs: journalctl -u nginx -f"
echo ""
print_info "Next Steps:"
echo "  1. Domain configured: ${DOMAIN_NAME}"
echo "  2. Configure SSL certificate: sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}"
echo "  3. Update .env file: sudo nano ${APP_DIR}/.env"
echo "     - Add your Gemini API key if needed"
echo "     - Verify database credentials"
echo "  4. Access the application at http://${DOMAIN_NAME} (or http://your-server-ip if DNS not configured)"
echo ""
print_info "Default login:"
echo "  - Email: admin@textile.com"
echo "  - Password: admin"
echo "  ⚠️  Change this after first login!"
echo ""
print_info "Troubleshooting:"
echo "  - Backend logs: sudo journalctl -u ${APP_NAME} -f"
echo "  - Nginx logs: sudo journalctl -u nginx -f"
echo "  - Test backend: curl http://localhost:${BACKEND_PORT}/api/health"
echo "  - Test database: mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"
echo ""
print_info "Deployment Options:"
echo "  - Deploy from GitHub: DEPLOY_FROM_GITHUB=true ./deploy.sh"
echo "  - Custom GitHub repo: GITHUB_REPO=https://github.com/user/repo.git ./deploy.sh"
echo "  - Custom branch: GITHUB_BRANCH=develop ./deploy.sh"
echo ""
print_warn "IMPORTANT: Save all passwords shown above!"
echo ""
