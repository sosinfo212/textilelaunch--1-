import express from 'express';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to get user ID from header
const getUserFromHeader = (req) => {
  return req.headers['x-user-id'] || null;
};

// Get all templates for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [templates] = await db.execute(
      'SELECT * FROM landing_page_templates WHERE owner_id = ?',
      [userId]
    );
    // Sort by created_at in JavaScript
    const sortedTemplates = templates.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // DESC order
    });

    res.json({ templates: sortedTemplates.map(formatTemplate) });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [templates] = await db.execute(
      'SELECT * FROM landing_page_templates WHERE id = ?',
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: formatTemplate(templates[0]) });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const userId = getUserFromHeader(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, mode = 'visual', elements, layout, htmlCode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = `tpl_${uuidv4()}`;
    const elementsJson = JSON.stringify(elements || []);
    const layoutJson = layout ? JSON.stringify(layout) : null;
    const htmlCodeValue = htmlCode || null;

    await db.execute(
      `INSERT INTO landing_page_templates (
        id, owner_id, name, mode, elements, layout, html_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, name, mode, elementsJson, layoutJson, htmlCodeValue]
    );

    const [templates] = await db.execute(
      'SELECT * FROM landing_page_templates WHERE id = ?',
      [id]
    );

    res.status(201).json({ template: formatTemplate(templates[0]) });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserFromHeader(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existing] = await db.execute(
      'SELECT owner_id FROM landing_page_templates WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, mode, elements, layout, htmlCode } = req.body;
    const elementsJson = JSON.stringify(elements || []);
    const layoutJson = layout ? JSON.stringify(layout) : null;
    const htmlCodeValue = htmlCode || null;

    await db.execute(
      `UPDATE landing_page_templates SET 
        name = ?, mode = ?, elements = ?, layout = ?, html_code = ?
      WHERE id = ?`,
      [name, mode || 'visual', elementsJson, layoutJson, htmlCodeValue, id]
    );

    const [templates] = await db.execute(
      'SELECT * FROM landing_page_templates WHERE id = ?',
      [id]
    );

    res.json({ template: formatTemplate(templates[0]) });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserFromHeader(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check ownership
    const [existing] = await db.execute(
      'SELECT owner_id FROM landing_page_templates WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.execute(
      'DELETE FROM landing_page_templates WHERE id = ?',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format template
function formatTemplate(row) {
  let elements = [];
  let layout = null;
  
  try {
    // Handle elements - could be JSON string or already parsed
    if (typeof row.elements === 'string') {
      elements = JSON.parse(row.elements || '[]');
    } else if (Array.isArray(row.elements)) {
      elements = row.elements;
    } else if (row.elements && typeof row.elements === 'object') {
      // If it's an object but not an array, wrap it
      elements = [row.elements];
    } else {
      elements = [];
    }
  } catch (e) {
    console.error('Error parsing elements:', e, row.elements);
    elements = [];
  }
  
  try {
    // Handle layout - could be JSON string or already parsed
    if (row.layout) {
      if (typeof row.layout === 'string') {
        layout = JSON.parse(row.layout);
      } else if (typeof row.layout === 'object') {
        layout = row.layout;
      }
    }
  } catch (e) {
    console.error('Error parsing layout:', e, row.layout);
    layout = null;
  }
  
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    mode: row.mode || 'visual',
    elements: elements,
    layout: layout || undefined,
    htmlCode: row.html_code || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

export default router;
