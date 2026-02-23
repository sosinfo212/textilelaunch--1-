import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import templatesRoutes from './routes/templates.js';
import settingsRoutes from './routes/settings.js';
import geminiRoutes from './routes/gemini.js';
import analyticsRoutes from './routes/analytics.js';
import trackingRoutes from './routes/tracking.js';
import integrationsRoutes from './routes/integrations.js';
import stripeRoutes, { stripeWebhookHandler } from './routes/stripe.js';
import { setupSwagger } from './swagger.js';

// Load .env file - specify path explicitly
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Load .env file if it exists
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env from:', envPath);
} else {
  console.warn('⚠️ .env file not found at:', envPath);
  console.warn('⚠️ Using environment variables from system or defaults');
  dotenv.config(); // Try default location
}

// Debug: Log database config (without password)
console.log('📊 Database config:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'agency',
  password: process.env.DB_PASSWORD ? '***' : 'NOT SET'
});

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware - CORS must be before cookie parser
// Configure CORS origins
let corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
if (process.env.ALLOWED_ORIGINS) {
  // If ALLOWED_ORIGINS is set, use it (comma-separated list)
  corsOrigin = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
} else if (process.env.FRONTEND_URL) {
  // Use FRONTEND_URL if set (supports both http and https)
  corsOrigin = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL.replace('https://', 'http://'),
    process.env.FRONTEND_URL.replace('http://', 'https://')
  ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
} else {
  // Default origins if nothing is set
  corsOrigin = [
    'http://localhost:3000',
    'http://trendycosmetix.com',
    'https://trendycosmetix.com',
    'http://trendycosmeticx.com',
    'https://trendycosmeticx.com',
    'http://76.13.36.165',
    'http://www.trendycosmetix.com',
    'https://www.trendycosmetix.com',
    'http://www.trendycosmeticx.com',
    'https://www.trendycosmeticx.com'
  ];
}

app.use(cors({
  origin: corsOrigin,
  credentials: true, // CRITICAL: Required to allow cookies in CORS requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));
// Stripe webhook needs raw body (must be before express.json())
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
// Increase body size limit to 50MB for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Session configuration
// Use environment variables for cookie settings (HTTPS requires secure: true)
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');

console.log('🍪 Cookie configuration:', {
  secure: cookieSecure,
  sameSite: cookieSameSite,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
  FRONTEND_URL: process.env.FRONTEND_URL
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'textilelaunch-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: cookieSecure, // true for HTTPS, false for HTTP
    httpOnly: true,
    sameSite: cookieSameSite, // 'none' for cross-site with HTTPS, 'lax' for same-site
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/' // Ensure cookie is available for all paths
  }
}));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agency',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
db.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    console.log('📊 Connected to:', {
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'agency',
      user: process.env.DB_USER || 'root'
    });
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    console.error('❌ Database config used:', {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'agency',
      password: process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'
    });
    console.error('❌ Error details:', err.message);
    console.error('❌ Error code:', err.code);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/stripe', stripeRoutes);

// Swagger API documentation
setupSwagger(app);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trendy Cosmetix API is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Accessible from: http://localhost:${PORT}`);
  if (process.env.FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  }
});
