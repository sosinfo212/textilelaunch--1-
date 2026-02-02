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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS must be before cookie parser
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));
// Increase body size limit to 50MB for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Session configuration (for additional session management if needed)
app.use(session({
  secret: process.env.SESSION_SECRET || 'textilelaunch-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
