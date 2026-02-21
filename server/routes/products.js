import express from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to get user ID from header
const getUserFromHeader = (req) => {
  return req.headers['x-user-id'] || null;
};

// Get all products for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    
    if (userId) {
      // Get user's products - sort in JavaScript to avoid MySQL memory issues with large JSON fields
      const [products] = await db.execute(
        'SELECT * FROM products WHERE owner_id = ?',
        [userId]
      );
      // Sort by created_at in JavaScript
      const sortedProducts = products.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // DESC order
      });
      res.json({ products: sortedProducts.map(formatProduct) });
    } else {
      // Public access - get all products (for landing pages)
      const [products] = await db.execute(
        'SELECT * FROM products'
      );
      // Sort by created_at in JavaScript
      const sortedProducts = products.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // DESC order
      });
      res.json({ products: sortedProducts.map(formatProduct) });
    }
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product (public access allowed)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: formatProduct(products[0]) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Creating product for user:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Videos received:', req.body.videos);

    const {
      name,
      description,
      price,
      regularPrice,
      currency,
      sku,
      showSku,
      images,
      videos,
      attributes,
      category,
      supplier,
      landingPageTemplateId
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Generate simple product ID: Prod_timestamp (base36 for shorter URL)
    const id = `Prod_${Date.now().toString(36)}`;
    const imagesJson = JSON.stringify(images || []);
    const videosJson = JSON.stringify(videos || []);
    const attributesJson = JSON.stringify(attributes || []);
    
    // Ensure price is a number
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    const regularPriceNum = regularPrice ? (typeof regularPrice === 'string' ? parseFloat(regularPrice) : regularPrice) : null;

    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    await db.execute(
      `INSERT INTO products (
        id, owner_id, name, description, price, regular_price, currency, sku, show_sku,
        images, videos, attributes, category, supplier, landing_page_template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, name, description || '', priceNum, regularPriceNum, currency || 'MAD',
        sku || null, showSku ? 1 : 0,
        imagesJson, videosJson, attributesJson, category || null, supplier || null,
        landingPageTemplateId || null
      ]
    );

    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.status(201).json({ product: formatProduct(products[0]) });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existing] = await db.execute(
      'SELECT owner_id FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      name,
      description,
      price,
      regularPrice,
      currency,
      sku,
      showSku,
      images,
      videos,
      attributes,
      category,
      supplier,
      landingPageTemplateId
    } = req.body;

    const imagesJson = JSON.stringify(images || []);
    const videosJson = JSON.stringify(videos || []);
    const attributesJson = JSON.stringify(attributes || []);

    await db.execute(
      `UPDATE products SET 
        name = ?, description = ?, price = ?, regular_price = ?, currency = ?, sku = ?, show_sku = ?,
        images = ?, videos = ?, attributes = ?, category = ?, supplier = ?,
        landing_page_template_id = ?
      WHERE id = ?`,
      [
        name, description || '', price, regularPrice || null, currency || 'MAD',
        sku || null, showSku ? 1 : 0,
        imagesJson, videosJson, attributesJson, category || null, supplier || null,
        landingPageTemplateId || null, id
      ]
    );

    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json({ product: formatProduct(products[0]) });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existing] = await db.execute(
      'SELECT owner_id FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.execute('DELETE FROM product_views WHERE product_id = ?', [id]).catch(() => {});
    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record landing page view (public - for analytics). Optional: device, browser.
router.post('/:id/view', async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { sessionId, device, browser } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 191) {
      return res.status(400).json({ error: 'sessionId required' });
    }
    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    const viewId = `pv_${uuidv4()}`;
    const dev = (device && String(device).slice(0, 50)) || null;
    const br = (browser && String(browser).slice(0, 100)) || null;
    await db.execute(
      `INSERT INTO product_views (id, product_id, session_id, first_seen_at, time_spent_seconds, device, browser)
       VALUES (?, ?, ?, NOW(), 0, ?, ?)
       ON DUPLICATE KEY UPDATE first_seen_at = first_seen_at, device = COALESCE(?, device), browser = COALESCE(?, browser)`,
      [viewId, productId, sessionId, dev, br, dev, br]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('Product view: product_views table missing. Run database/add-product-views-table.sql');
      return res.status(503).json({ error: 'Analytics not configured' });
    }
    console.error('Product view error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record leave / time spent (public). Optional: device, browser.
router.post('/:id/view/leave', async (req, res) => {
  try {
    const { id: productId } = req.params;
    const body = req.body || {};
    let { sessionId, timeSpentSeconds, device, browser } = body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId required' });
    }
    if (typeof timeSpentSeconds === 'string') timeSpentSeconds = parseInt(timeSpentSeconds, 10);
    if (typeof timeSpentSeconds !== 'number' || isNaN(timeSpentSeconds)) {
      return res.status(400).json({ error: 'timeSpentSeconds required (number)' });
    }
    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    const dev = (device && String(device).slice(0, 50)) || null;
    const br = (browser && String(browser).slice(0, 100)) || null;
    const timeSec = Math.min(Math.round(timeSpentSeconds), 86400);
    await db.execute(
      `UPDATE product_views SET time_spent_seconds = GREATEST(COALESCE(time_spent_seconds, 0), ?), device = COALESCE(?, device), browser = COALESCE(?, browser) WHERE product_id = ? AND session_id = ?`,
      [timeSec, dev, br, productId, sessionId]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Analytics not configured' });
    }
    console.error('Product view leave error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product analytics (auth, owner only). Includes tracking: device & browser breakdown.
router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { id: productId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const [products] = await db.execute('SELECT owner_id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (products[0].owner_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    let uniqueClicks = 0;
    let totalTimeSpentSeconds = 0;
    const deviceBreakdown = { android: 0, iphone: 0, computer: 0 };
    const browserBreakdown = {};

    try {
      const [views] = await db.execute(
        'SELECT COUNT(*) AS cnt, COALESCE(SUM(time_spent_seconds), 0) AS total FROM product_views WHERE product_id = ?',
        [productId]
      );
      if (views.length) {
        uniqueClicks = Number(views[0].cnt) || 0;
        totalTimeSpentSeconds = Number(views[0].total) || 0;
      }

      try {
        const [byDevice] = await db.execute(
          'SELECT device, COUNT(*) AS cnt FROM product_views WHERE product_id = ? AND device IS NOT NULL AND device != "" GROUP BY device',
          [productId]
        );
        for (const row of byDevice) {
          const d = (row.device || '').toLowerCase().trim() || 'unknown';
          deviceBreakdown[d] = Number(row.cnt) || 0;
        }
      } catch (e) {
        if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      }

      try {
        const [byBrowser] = await db.execute(
          'SELECT browser, COUNT(*) AS cnt FROM product_views WHERE product_id = ? AND browser IS NOT NULL AND browser != "" GROUP BY browser',
          [productId]
        );
        for (const row of byBrowser) {
          const b = (row.browser || 'Unknown').trim() || 'Unknown';
          browserBreakdown[b] = Number(row.cnt) || 0;
        }
      } catch (e) {
        if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      }
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    }

    const [orderCount] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM orders WHERE product_id = ?',
      [productId]
    );
    const totalOrders = orderCount.length ? Number(orderCount[0].cnt) || 0 : 0;

    res.json({
      analytics: {
        uniqueClicks,
        totalOrders,
        totalTimeSpentSeconds: Math.round(totalTimeSpentSeconds),
        deviceBreakdown,
        browserBreakdown,
      },
    });
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format product
function formatProduct(row) {
  let images = [];
  let videos = [];
  let attributes = [];
  
  try {
    // Handle images - could be JSON string or already parsed
    if (typeof row.images === 'string') {
      images = JSON.parse(row.images || '[]');
    } else if (Array.isArray(row.images)) {
      images = row.images;
    } else {
      images = [];
    }
  } catch (e) {
    console.error('Error parsing images:', e, row.images);
    images = [];
  }
  
  try {
    // Handle videos - could be JSON string or already parsed
    if (typeof row.videos === 'string') {
      videos = JSON.parse(row.videos || '[]');
    } else if (Array.isArray(row.videos)) {
      videos = row.videos;
    } else {
      videos = [];
    }
  } catch (e) {
    console.error('Error parsing videos:', e, row.videos);
    videos = [];
  }
  
  try {
    // Handle attributes - could be JSON string or already parsed
    if (typeof row.attributes === 'string') {
      attributes = JSON.parse(row.attributes || '[]');
    } else if (Array.isArray(row.attributes)) {
      attributes = row.attributes;
    } else {
      attributes = [];
    }
  } catch (e) {
    console.error('Error parsing attributes:', e, row.attributes);
    attributes = [];
  }
  
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || '',
    price: parseFloat(row.price),
    regularPrice: row.regular_price ? parseFloat(row.regular_price) : undefined,
    currency: row.currency || 'MAD',
    sku: row.sku || undefined,
    showSku: row.show_sku === 1 || row.show_sku === true,
    images: images,
    videos: videos.length > 0 ? videos : undefined,
    attributes: attributes,
    category: row.category || undefined,
    supplier: row.supplier || undefined,
    landingPageTemplateId: row.landing_page_template_id || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

export default router;
