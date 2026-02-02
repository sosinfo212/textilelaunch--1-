# TextileLaunch - Deployment Guide

This guide will help you deploy TextileLaunch with MySQL database integration.

## Prerequisites

- Node.js (v18 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

## Database Setup

1. **Start MySQL Server**
   ```bash
   # On macOS with Homebrew
   brew services start mysql
   
   # On Linux
   sudo systemctl start mysql
   
   # On Windows
   # Start MySQL from Services or MySQL Workbench
   ```

2. **Create Database and Tables**
   ```bash
   # Connect to MySQL
   mysql -u root -p
   
   # Run the schema file
   source database/schema.sql
   
   # Or manually:
   mysql -u root -p < database/schema.sql
   ```

   The schema will:
   - Create the `agency` database
   - Create all required tables (users, products, orders, landing_page_templates, app_settings)
   - Insert default admin user (email: `admin@textile.com`, password: `admin`)

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   The `.env` file is already created with default values:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=rootroot
   DB_NAME=agency
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

   Update these values if your MySQL configuration is different.

## Running the Application

### Development Mode

1. **Start the Backend Server**
   ```bash
   npm run server
   # Or with auto-reload:
   npm run dev:server
   ```
   
   The server will start on `http://localhost:5000`

2. **Start the Frontend (in a new terminal)**
   ```bash
   npm run dev
   ```
   
   The frontend will start on `http://localhost:3000`

### Production Mode

1. **Build the Frontend**
   ```bash
   npm run build
   ```

2. **Start the Backend**
   ```bash
   npm start
   ```

   For production, consider using:
   - PM2 for process management: `pm2 start server/index.js`
   - Nginx as reverse proxy
   - Environment-specific `.env` files

## Default Login Credentials

- **Email**: `admin@textile.com`
- **Password**: `admin`

⚠️ **Important**: Change the default admin password after first login!

## API Endpoints

The backend API runs on `http://localhost:5000/api`:

- **Auth**: `/api/auth/login`, `/api/auth/me`, `/api/auth/users`
- **Products**: `/api/products`, `/api/products/:id`
- **Orders**: `/api/orders`, `/api/orders/:id`
- **Templates**: `/api/templates`, `/api/templates/:id`
- **Settings**: `/api/settings`
- **Gemini**: `/api/gemini/generate`

## Troubleshooting

### Database Connection Issues

1. **Check MySQL is running**
   ```bash
   mysql -u root -p -e "SELECT 1"
   ```

2. **Verify database exists**
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'agency'"
   ```

3. **Check credentials in `.env`**
   - Ensure `DB_USER` and `DB_PASSWORD` match your MySQL credentials
   - Verify `DB_NAME` is `agency`

### Port Already in Use

If port 5000 or 3000 is already in use:

1. **Change backend port**: Update `PORT` in `.env`
2. **Change frontend port**: Update `vite.config.ts` server.port
3. **Update API URL**: Set `VITE_API_URL` in `.env` to match backend port

### CORS Issues

If you see CORS errors:

1. Update `FRONTEND_URL` in `.env` to match your frontend URL
2. Restart the backend server

## Data Migration from localStorage

If you have existing data in localStorage:

1. The app will automatically use the database once connected
2. Old localStorage data will be ignored
3. To migrate existing data, you can:
   - Export from localStorage manually
   - Import via the API endpoints
   - Or re-enter data through the UI

## Next Steps

- Configure your Gemini API key in Settings for AI-powered descriptions
- Customize your shop name and logo in Settings
- Add products and create landing pages
- Share your product landing pages with customers

## Support

For issues or questions, check:
- `DEVELOPER_DOCS.md` for architecture details
- `README.md` for general project information
