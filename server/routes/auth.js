  import express from 'express';
  import bcrypt from 'bcrypt';
  import { db } from '../index.js';
  import { v4 as uuidv4 } from 'uuid';
  import { generateToken, authenticate, requireAdmin } from '../middleware/auth.js';

  const router = express.Router();

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user with password hash
      const [users] = await db.execute(
        'SELECT id, email, name, role, password FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        // Don't reveal if user exists (security best practice)
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      
      // Check if password is hashed (starts with $2b$ or $2a$)
      let passwordValid = false;
      if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
        // Password is hashed, use bcrypt
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text password (for migration)
        passwordValid = user.password === password;
        
        // If valid, hash it for future use
        if (passwordValid) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
          );
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      let token;
      try {
        token = generateToken(user.id);
        if (!token) {
          console.error('Failed to generate token for user:', user.id);
          return res.status(500).json({ error: 'Failed to generate authentication token' });
        }
      } catch (error) {
        console.error('Error generating token:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Store session in database
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      try {
        await db.execute(
          'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
          [sessionId, user.id, token, expiresAt]
        );
      } catch (error) {
        console.error('Error storing session in database:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error sqlState:', error.sqlState);
        // Check if sessions table exists
        if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
          console.error('❌ Sessions table does not exist! Please run database/schema.sql');
          return res.status(500).json({ 
            error: 'Database configuration error. Sessions table missing.',
            details: process.env.NODE_ENV !== 'production' ? 'Run database/schema.sql to create the sessions table' : undefined
          });
        }
        return res.status(500).json({ 
          error: 'Failed to create session',
          details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Set session cookie (session ID)
      // Use environment variables for cookie settings (HTTPS requires secure: true)
      const cookieSecure = process.env.COOKIE_SECURE === 'true';
      const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');
      
      const cookieOptions = {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/', // Ensure cookie is available for all paths
        secure: cookieSecure, // true for HTTPS, false for HTTP
        sameSite: cookieSameSite // 'none' for cross-site with HTTPS, 'lax' for same-site
      };
      
      // Don't set domain for localhost - browser will handle it correctly
      // Setting domain explicitly can break cookie sharing between ports
      
      res.cookie('sessionId', sessionId, cookieOptions);

      res.json({ 
        user: userWithoutPassword
        // No token in response - only in HTTP-only cookie
      });
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error sqlState:', error.sqlState);
      
      // Check for database connection errors
      if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.message?.includes('Access denied')) {
        console.error('❌ Database access denied - check DB_USER and DB_PASSWORD in .env');
        return res.status(500).json({ 
          error: 'Database configuration error',
          details: process.env.NODE_ENV !== 'production' ? 'Database access denied. Check server configuration.' : undefined
        });
      }
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
        console.error('❌ Database connection refused');
        return res.status(500).json({ 
          error: 'Database connection error',
          details: process.env.NODE_ENV !== 'production' ? 'Cannot connect to database. Check DB_HOST and DB_PORT.' : undefined
        });
      }
      
      // Check for specific errors
      if (error.message && error.message.includes('bcrypt')) {
        console.error('❌ bcrypt error - module may not be installed correctly');
        return res.status(500).json({ 
          error: 'Authentication system error',
          details: process.env.NODE_ENV !== 'production' ? 'bcrypt module error: ' + error.message : undefined
        });
      }
      
      if (error.message && error.message.includes('Cannot find module')) {
        console.error('❌ Module missing:', error.message);
        return res.status(500).json({ 
          error: 'Server configuration error',
          details: process.env.NODE_ENV !== 'production' ? 'Missing module: ' + error.message : undefined
        });
      }
      
      // In development, return more details
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error';
      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  // Logout
  router.post('/logout', authenticate, async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      
      // Remove session from database
      if (sessionId) {
        try {
          await db.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
        } catch (error) {
          console.error('Error deleting session from database:', error);
        }
      }
      
      // Clear session cookie
      res.clearCookie('sessionId');
      // Also clear legacy token cookie if it exists
      res.clearCookie('token');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user (for session check)
  router.get('/me', authenticate, async (req, res) => {
    try {
      // User is already attached by authenticate middleware
      res.json({ user: req.user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all users (admin only)
  router.get('/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const [users] = await db.execute(
        'SELECT id, email, name, role FROM users'
      );
      res.json({ users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add user (admin only)
  router.post('/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const { email, password, name, role = 'user' } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const id = `usr_${uuidv4()}`;
      await db.execute(
        'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
        [id, email, hashedPassword, name, role]
      );

      // Create default settings for new user
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name) VALUES (?, ?)',
        [id, 'TextileLaunch Store']
      );

      res.json({ user: { id, email, name, role } });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Add user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user (admin or self)
  router.put('/users/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, password, name, role } = req.body;

      // Check if user can update (admin or self)
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }

      // Only admin can change role
      if (role && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can change user role' });
      }

      const updates = [];
      const values = [];

      if (email) {
        updates.push('email = ?');
        values.push(email);
      }
      if (password) {
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        values.push(hashedPassword);
      }
      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (role && req.user.role === 'admin') {
        updates.push('role = ?');
        values.push(role);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      await db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const [users] = await db.execute(
        'SELECT id, email, name, role FROM users WHERE id = ?',
        [id]
      );

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete user (admin only)
  router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }
      
      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  export default router;
