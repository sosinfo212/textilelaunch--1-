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
} else if (!process.env.FRONTEND_URL) {
  // Default origins if nothing is set
  corsOrigin = [
    'http://localhost:3000',
    'http://trendycosmeticx.com',
    'https://trendycosmeticx.com',
    'http://76.13.36.165',
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
// Increase body size limit to 50MB for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Session configuration
// For HTTP (IP-only) setup: secure must be false, sameSite should be 'lax'
app.use(session({
  secret: process.env.SESSION_SECRET || 'textilelaunch-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Must be false for HTTP (IP-only setup)
    httpOnly: true,
    sameSite: 'lax', // Allows cookies to be sent with cross-site requests
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
  host: process.env.DB_HOST || 'mysql://mysql:qvP2wuiZ0qtXcLkcoX1t462aMbchNGHC6Qv63BJSNfDIuP2VfPREet1aBXgEvFLW@o8w4kckgsoo48kgogsg4sc0s:3306/default',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'qvP2wuiZ0qtXcLkcoX1t462aMbchNGHC6Qv63BJSNfDIuP2VfPREet1aBXgEvFLW',
  database: process.env.DB_NAME || 'mysql-database-o8w4ckgso48kgogsg4sc0s',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
db.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TextileLaunch API is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Accessible from: http://localhost:${PORT}`);
  if (process.env.FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  }
});
