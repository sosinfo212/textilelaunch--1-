import express from 'express';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to get user ID from header
const getUserFromHeader = (req) => {
  return req.headers['x-user-id'] || null;
};

// Get settings for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [settings] = await db.execute(
      'SELECT * FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Create default settings if none exist
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name) VALUES (?, ?)',
        [userId, 'Trendy Cosmetix Store']
      );
      
      const [newSettings] = await db.execute(
        'SELECT * FROM app_settings WHERE user_id = ?',
        [userId]
      );
      
      return res.json({ settings: formatSettings(newSettings[0]) });
    }

    res.json({ settings: formatSettings(settings[0]) });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { shopName, logoUrl, geminiApiKey } = req.body;

    // Check if settings exist
    const [existing] = await db.execute(
      'SELECT user_id FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Create new settings
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name, logo_url, gemini_api_key) VALUES (?, ?, ?, ?)',
        [userId, shopName || 'Trendy Cosmetix Store', logoUrl || '', geminiApiKey || '']
      );
    } else {
      // Update existing settings
      const updates = [];
      const values = [];

      if (shopName !== undefined) {
        updates.push('shop_name = ?');
        values.push(shopName);
      }
      if (logoUrl !== undefined) {
        updates.push('logo_url = ?');
        values.push(logoUrl);
      }
      if (geminiApiKey !== undefined) {
        updates.push('gemini_api_key = ?');
        values.push(geminiApiKey);
      }

      if (updates.length > 0) {
        values.push(userId);
        await db.execute(
          `UPDATE app_settings SET ${updates.join(', ')} WHERE user_id = ?`,
          values
        );
      }
    }

    const [settings] = await db.execute(
      'SELECT * FROM app_settings WHERE user_id = ?',
      [userId]
    );

    res.json({ settings: formatSettings(settings[0]) });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get settings for specific user (admin only)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [settings] = await db.execute(
      'SELECT * FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({ settings: formatSettings(settings[0]) });
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format settings
function formatSettings(row) {
  return {
    userId: row.user_id,
    shopName: row.shop_name || 'Trendy Cosmetix Store',
    logoUrl: row.logo_url || '',
    geminiApiKey: row.gemini_api_key || ''
  };
}

export default router;
