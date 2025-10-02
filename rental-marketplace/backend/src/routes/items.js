const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../frontend/public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Get all items with optional filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, location, page = 1, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM items WHERE status = ?';
    const params = ['available'];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (minPrice) {
      query += ' AND price_per_day >= ?';
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      query += ' AND price_per_day <= ?';
      params.push(parseFloat(maxPrice));
    }
    
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const items = await db.allAsync(query, params);
    
    // Parse JSON fields
    const parsedItems = items.map(item => ({
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      isVerified: item.is_verified === 1
    }));
    
    res.json({ items: parsedItems });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Error fetching items' });
  }
});

// Get single item
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const item = await db.getAsync(
      'SELECT * FROM items WHERE id = ?',
      [req.params.id]
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Get owner info (without sensitive data)
    const owner = await db.getAsync(
      'SELECT id, full_name, is_verified FROM users WHERE id = ?',
      [item.owner_id]
    );
    
    res.json({
      item: {
        ...item,
        images: item.images ? JSON.parse(item.images) : [],
        owner: {
          id: owner.id,
          fullName: owner.full_name,
          isVerified: owner.is_verified === 1
        }
      }
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Error fetching item' });
  }
});

// Create new item
router.post('/', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, pricePerDay, depositAmount, location } = req.body;
    
    if (!title || !category || !pricePerDay) {
      return res.status(400).json({ error: 'Title, category, and price are required' });
    }
    
    // Process uploaded images
    const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const result = await db.runAsync(
      `INSERT INTO items (owner_id, title, description, category, price_per_day, deposit_amount, location, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description || null,
        category,
        parseFloat(pricePerDay),
        depositAmount ? parseFloat(depositAmount) : 0,
        location || null,
        JSON.stringify(imagePaths)
      ]
    );
    
    res.status(201).json({
      message: 'Item created successfully',
      itemId: result.lastID
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Error creating item' });
  }
});

// Update item
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, category, pricePerDay, depositAmount, location, status } = req.body;
    
    // Verify ownership
    const item = await db.getAsync(
      'SELECT owner_id FROM items WHERE id = ?',
      [req.params.id]
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }
    
    await db.runAsync(
      `UPDATE items SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       category = COALESCE(?, category),
       price_per_day = COALESCE(?, price_per_day),
       deposit_amount = COALESCE(?, deposit_amount),
       location = COALESCE(?, location),
       status = COALESCE(?, status),
       updated_at = datetime('now')
       WHERE id = ?`,
      [title, description, category, pricePerDay, depositAmount, location, status, req.params.id]
    );
    
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Error updating item' });
  }
});

// Delete item
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await db.getAsync(
      'SELECT owner_id FROM items WHERE id = ?',
      [req.params.id]
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }
    
    await db.runAsync('DELETE FROM items WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Error deleting item' });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await db.allAsync(
      'SELECT DISTINCT category, COUNT(*) as count FROM items GROUP BY category ORDER BY count DESC'
    );
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

module.exports = router;
