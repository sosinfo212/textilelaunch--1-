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

    // Select specific columns to avoid issues if facebook_pixel_code doesn't exist yet
    const [settings] = await db.execute(
      'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Create default settings if none exist
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name) VALUES (?, ?)',
        [userId, 'Trendy Cosmetix Store']
      );
      
      const [newSettings] = await db.execute(
        'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code FROM app_settings WHERE user_id = ?',
        [userId]
      );
      
      return res.json({ settings: formatSettings(newSettings[0]) });
    }

    res.json({ settings: formatSettings(settings[0]) });
  } catch (error) {
    console.error('Get settings error:', error);
    console.error('Error details:', error.message, error.code, error.sqlState);
    
    // If column doesn't exist, try without it
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('facebook_pixel_code')) {
      console.log('[Settings] facebook_pixel_code column missing, trying without it');
      try {
        const [settings] = await db.execute(
          'SELECT user_id, shop_name, logo_url, gemini_api_key FROM app_settings WHERE user_id = ?',
          [userId]
        );
        if (settings.length > 0) {
          const formatted = formatSettings({ ...settings[0], facebook_pixel_code: '' });
          return res.json({ settings: formatted });
        }
      } catch (retryError) {
        console.error('Retry query also failed:', retryError);
      }
    }
    
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

    const { shopName, logoUrl, geminiApiKey, facebookPixelCode } = req.body;
    
    console.log(`[Settings] Update request for userId: ${userId}`);
    console.log(`[Settings] Received data:`, {
      shopName: shopName ? 'provided' : 'missing',
      logoUrl: logoUrl ? 'provided' : 'missing',
      geminiApiKey: geminiApiKey ? 'provided' : 'missing',
      facebookPixelCode: facebookPixelCode ? `provided (${facebookPixelCode.length} chars)` : 'missing'
    });

    // Check if settings exist
    const [existing] = await db.execute(
      'SELECT user_id FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Create new settings
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name, logo_url, gemini_api_key, facebook_pixel_code) VALUES (?, ?, ?, ?, ?)',
        [userId, shopName || 'Trendy Cosmetix Store', logoUrl || '', geminiApiKey || '', facebookPixelCode || '']
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
      if (facebookPixelCode !== undefined) {
        updates.push('facebook_pixel_code = ?');
        values.push(facebookPixelCode);
      }

      if (updates.length > 0) {
        values.push(userId);
        console.log(`[Settings] Executing UPDATE with ${updates.length} fields:`, updates);
        await db.execute(
          `UPDATE app_settings SET ${updates.join(', ')} WHERE user_id = ?`,
          values
        );
        console.log(`[Settings] Update successful for userId: ${userId}`);
      } else {
        console.log(`[Settings] No updates to apply for userId: ${userId}`);
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

// Get settings for specific user (public endpoint for landing pages)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[Settings] Fetching public settings for userId: ${userId}`);
    
    // Select specific columns to avoid issues if facebook_pixel_code doesn't exist yet
    const [settings] = await db.execute(
      'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      console.log(`[Settings] No settings found for userId: ${userId}, returning defaults`);
      return res.json({ settings: formatSettings({ user_id: userId, shop_name: 'Trendy Cosmetix Store', logo_url: '', gemini_api_key: '', facebook_pixel_code: '' }) });
    }

    const formatted = formatSettings(settings[0]);
    console.log(`[Settings] Settings found for userId: ${userId}, facebookPixelCode length: ${formatted.facebookPixelCode?.length || 0}`);
    
    res.json({ settings: formatted });
  } catch (error) {
    console.error('Get user settings error:', error);
    console.error('Error details:', error.message, error.code, error.sqlState);
    
    // If column doesn't exist, return settings without facebook_pixel_code
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('facebook_pixel_code')) {
      console.log('[Settings] facebook_pixel_code column missing, returning settings without it');
      try {
        const [settings] = await db.execute(
          'SELECT user_id, shop_name, logo_url, gemini_api_key FROM app_settings WHERE user_id = ?',
          [userId]
        );
        if (settings.length > 0) {
          const formatted = formatSettings({ ...settings[0], facebook_pixel_code: '' });
          return res.json({ settings: formatted });
        }
      } catch (retryError) {
        console.error('Retry query also failed:', retryError);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format settings
function formatSettings(row) {
  return {
    userId: row.user_id,
    shopName: row.shop_name || 'Trendy Cosmetix Store',
    logoUrl: row.logo_url || '',
    geminiApiKey: row.gemini_api_key || '',
    facebookPixelCode: row.facebook_pixel_code || ''
  };
}

export default router;
