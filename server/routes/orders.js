import express from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to get user ID from header
const getUserFromHeader = (req) => {
  return req.headers['x-user-id'] || null;
};

// Get all orders for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get orders without ORDER BY to avoid MySQL memory issues with large JSON fields
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE seller_id = ?',
      [userId]
    );
    // Sort by created_at in JavaScript
    const sortedOrders = orders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // DESC order
    });

    res.json({ orders: sortedOrders.map(formatOrder) });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND seller_id = ?',
      [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: formatOrder(orders[0]) });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order (public endpoint for landing pages)
router.post('/', async (req, res) => {
  try {
    const {
      productId,
      productName,
      productPrice,
      productSupplier,
      customer,
      selectedAttributes
    } = req.body;

    if (!productId || !customer || !selectedAttributes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get product owner to set seller_id
    const [products] = await db.execute(
      'SELECT owner_id FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const sellerId = products[0].owner_id;
    const id = `order_${uuidv4()}`;
    const customerJson = JSON.stringify(customer);
    const attributesJson = JSON.stringify(selectedAttributes);

    await db.execute(
      `INSERT INTO orders (
        id, seller_id, product_id, product_name, product_price,
        product_supplier, customer_info, selected_attributes, status, viewed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', FALSE)`,
      [
        id, sellerId, productId, productName, productPrice,
        productSupplier || null, customerJson, attributesJson
      ]
    );

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    res.status(201).json({ order: formatOrder(orders[0]) });
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error details:', error.message, error.code, error.sqlState);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['pending', 'shipped', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.execute(
      'UPDATE orders SET status = ? WHERE id = ? AND seller_id = ?',
      [status, id, userId]
    );

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    res.json({ order: formatOrder(orders[0]) });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark order as viewed
router.patch('/:id/viewed', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await db.execute(
      'UPDATE orders SET viewed = TRUE WHERE id = ? AND seller_id = ?',
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark order viewed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existing] = await db.execute(
      'SELECT seller_id FROM orders WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (existing[0].seller_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.execute('DELETE FROM orders WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format order
function formatOrder(row) {
  let customer = {};
  let selectedAttributes = {};
  
  try {
    // Handle customer_info - could be JSON string or already parsed
    if (typeof row.customer_info === 'string') {
      customer = JSON.parse(row.customer_info || '{}');
    } else if (row.customer_info && typeof row.customer_info === 'object') {
      customer = row.customer_info;
    }
  } catch (e) {
    console.error('Error parsing customer_info:', e, row.customer_info);
    customer = {};
  }
  
  try {
    // Handle selected_attributes - could be JSON string or already parsed
    if (typeof row.selected_attributes === 'string') {
      selectedAttributes = JSON.parse(row.selected_attributes || '{}');
    } else if (row.selected_attributes && typeof row.selected_attributes === 'object') {
      selectedAttributes = row.selected_attributes;
    }
  } catch (e) {
    console.error('Error parsing selected_attributes:', e, row.selected_attributes);
    selectedAttributes = {};
  }
  
  return {
    id: row.id,
    sellerId: row.seller_id,
    productId: row.product_id,
    productName: row.product_name,
    productPrice: parseFloat(row.product_price),
    productSupplier: row.product_supplier || undefined,
    customer: customer,
    selectedAttributes: selectedAttributes,
    status: row.status,
    viewed: Boolean(row.viewed),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

export default router;
