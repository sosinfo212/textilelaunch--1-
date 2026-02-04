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

    const id = `prod_${uuidv4()}`;
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

    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
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
