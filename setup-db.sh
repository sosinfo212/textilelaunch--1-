#!/bin/bash

# TextileLaunch Database Setup Script

echo "🚀 Setting up TextileLaunch database..."

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-rootroot}
DB_NAME=${DB_NAME:-agency}

echo "📊 Connecting to MySQL..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "Database: $DB_NAME"

# Run the schema SQL file
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "Default admin credentials:"
    echo "  Email: admin@textile.com"
    echo "  Password: admin"
    echo ""
    echo "⚠️  Please change the default password after first login!"
else
    echo "❌ Database setup failed. Please check your MySQL credentials and try again."
    exit 1
fi
