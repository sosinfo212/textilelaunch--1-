import express from 'express';
import crypto from 'crypto';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const API_KEY_PREFIX = 'tl_';

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

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

    // Select specific columns to avoid issues if pixel columns don't exist yet
    const [settings] = await db.execute(
      'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code, COALESCE(tiktok_pixel_code, "") as tiktok_pixel_code, COALESCE(stripe_publishable_key, "") as stripe_publishable_key, COALESCE(stripe_secret_key, "") as stripe_secret_key, api_key_hash FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Create default settings if none exist
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name) VALUES (?, ?)',
        [userId, 'Trendy Cosmetix Store']
      );
      
      const [newSettings] = await db.execute(
        'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code, COALESCE(tiktok_pixel_code, "") as tiktok_pixel_code, COALESCE(stripe_publishable_key, "") as stripe_publishable_key, COALESCE(stripe_secret_key, "") as stripe_secret_key, api_key_hash FROM app_settings WHERE user_id = ?',
        [userId]
      );
      
      return res.json({ settings: formatSettings(newSettings[0]) });
    }

    res.json({ settings: formatSettings(settings[0]) });
  } catch (error) {
    console.error('Get settings error:', error);
    console.error('Error details:', error.message, error.code, error.sqlState);
    
    // If column doesn't exist, try without it
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      if (error.message.includes('api_key_hash')) {
        try {
          const [settings] = await db.execute(
            'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code, COALESCE(tiktok_pixel_code, "") as tiktok_pixel_code, COALESCE(stripe_publishable_key, "") as stripe_publishable_key, COALESCE(stripe_secret_key, "") as stripe_secret_key FROM app_settings WHERE user_id = ?',
            [userId]
          );
          if (settings.length > 0) {
            const formatted = formatSettings({ ...settings[0], api_key_hash: null });
            return res.json({ settings: formatted });
          }
        } catch (retryError) {
          console.error('Retry without api_key_hash failed:', retryError);
        }
      } else if (error.message.includes('facebook_pixel_code') || error.message.includes('tiktok_pixel_code')) {
        console.log('[Settings] pixel column missing, trying without it');
        try {
          const [settings] = await db.execute(
            'SELECT user_id, shop_name, logo_url, gemini_api_key FROM app_settings WHERE user_id = ?',
            [userId]
          );
          if (settings.length > 0) {
            const formatted = formatSettings({ ...settings[0], facebook_pixel_code: '', tiktok_pixel_code: '', api_key_hash: null });
            return res.json({ settings: formatted });
          }
        } catch (retryError) {
          console.error('Retry query also failed:', retryError);
        }
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

    const { shopName, logoUrl, geminiApiKey, facebookPixelCode, tiktokPixelCode, stripePublishableKey, stripeSecretKey } = req.body;
    
    console.log(`[Settings] Update request for userId: ${userId}`);
    console.log(`[Settings] Received data:`, {
      shopName: shopName ? 'provided' : 'missing',
      logoUrl: logoUrl ? 'provided' : 'missing',
      geminiApiKey: geminiApiKey ? 'provided' : 'missing',
      facebookPixelCode: facebookPixelCode ? `provided (${facebookPixelCode.length} chars)` : 'missing',
      tiktokPixelCode: tiktokPixelCode ? `provided (${tiktokPixelCode.length} chars)` : 'missing'
    });

    // Check if settings exist
    const [existing] = await db.execute(
      'SELECT user_id FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // Create new settings
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name, logo_url, gemini_api_key, facebook_pixel_code, tiktok_pixel_code) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, shopName || 'Trendy Cosmetix Store', logoUrl || '', geminiApiKey || '', facebookPixelCode || '', tiktokPixelCode || '']
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
      if (tiktokPixelCode !== undefined) {
        updates.push('tiktok_pixel_code = ?');
        values.push(tiktokPixelCode);
      }
      if (stripePublishableKey !== undefined) {
        updates.push('stripe_publishable_key = ?');
        values.push(stripePublishableKey);
      }
      if (stripeSecretKey !== undefined) {
        updates.push('stripe_secret_key = ?');
        values.push(stripeSecretKey);
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

// Generate API key (authenticated user only). Key is shown once; only hash is stored.
router.post('/generate-api-key', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const rawKey = `${API_KEY_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = hashApiKey(rawKey);

    const [existing] = await db.execute('SELECT user_id FROM app_settings WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      await db.execute(
        'INSERT INTO app_settings (user_id, shop_name, api_key_hash) VALUES (?, ?, ?)',
        [userId, 'Trendy Cosmetix Store', apiKeyHash]
      );
    } else {
      await db.execute('UPDATE app_settings SET api_key_hash = ? WHERE user_id = ?', [apiKeyHash, userId]);
    }

    res.status(201).json({
      apiKey: rawKey,
      message: 'Copy this key now. It will not be shown again. Use it in the Authorization header: Bearer <key>',
    });
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('api_key_hash')) {
      return res.status(503).json({
        error: 'API key feature not available. Run database/add-api-key-column.sql on your database.',
      });
    }
    console.error('Generate API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get settings for specific user (public endpoint for landing pages)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[Settings] Fetching public settings for userId: ${userId}`);
    
    // Select specific columns (include stripe_publishable_key for Stripe.js on landing)
    const [settings] = await db.execute(
      'SELECT user_id, shop_name, logo_url, gemini_api_key, COALESCE(facebook_pixel_code, "") as facebook_pixel_code, COALESCE(tiktok_pixel_code, "") as tiktok_pixel_code, COALESCE(stripe_publishable_key, "") as stripe_publishable_key FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      console.log(`[Settings] No settings found for userId: ${userId}, returning defaults`);
      return res.json({ settings: formatSettings({ user_id: userId, shop_name: 'Trendy Cosmetix Store', logo_url: '', gemini_api_key: '', facebook_pixel_code: '', tiktok_pixel_code: '', stripe_publishable_key: '' }) });
    }

    const formatted = formatSettings(settings[0]);
    console.log(`[Settings] Settings found for userId: ${userId}, facebookPixelCode length: ${formatted.facebookPixelCode?.length || 0}, tiktokPixelCode length: ${formatted.tiktokPixelCode?.length || 0}`);
    
    res.json({ settings: formatted });
  } catch (error) {
    console.error('Get user settings error:', error);
    console.error('Error details:', error.message, error.code, error.sqlState);
    
    // If column doesn't exist, return settings without pixel columns
    if (error.code === 'ER_BAD_FIELD_ERROR' && (error.message.includes('facebook_pixel_code') || error.message.includes('tiktok_pixel_code'))) {
      console.log('[Settings] pixel column missing, returning settings without it');
      try {
        const [settings] = await db.execute(
          'SELECT user_id, shop_name, logo_url, gemini_api_key FROM app_settings WHERE user_id = ?',
          [userId]
        );
        if (settings.length > 0) {
          const formatted = formatSettings({ ...settings[0], facebook_pixel_code: '', tiktok_pixel_code: '' });
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
  if (!row) return null;
  return {
    userId: row.user_id,
    shopName: row.shop_name || 'Trendy Cosmetix Store',
    logoUrl: row.logo_url || '',
    geminiApiKey: row.gemini_api_key || '',
    facebookPixelCode: row.facebook_pixel_code || '',
    tiktokPixelCode: row.tiktok_pixel_code || '',
    stripePublishableKey: row.stripe_publishable_key || '',
    stripeSecretKey: row.stripe_secret_key || '',
    hasApiKey: !!(row.api_key_hash && row.api_key_hash.length > 0),
  };
}

export default router;
