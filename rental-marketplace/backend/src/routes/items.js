const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all items with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, location } = req.query;
    
    let sql = `
      SELECT 
        i.*,
        u.first_name as owner_name,
        u.last_name as owner_last_name,
        AVG(r.rating) as avg_rating,
        COUNT(r.id) as review_count
      FROM items i
      LEFT JOIN users u ON i.owner_id = u.id
      LEFT JOIN reviews r ON i.id = r.item_id AND r.is_approved = 1
      WHERE i.is_available = 1
    `;
    
    const params = [];
    
    if (category) {
      sql += ' AND i.category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND (i.title LIKE ? OR i.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (minPrice) {
      sql += ' AND i.price_per_day >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice) {
      sql += ' AND i.price_per_day <= ?';
      params.push(maxPrice);
    }
    
    if (location) {
      sql += ' AND i.location LIKE ?';
      params.push(`%${location}%`);
    }
    
    sql += ' GROUP BY i.id ORDER BY i.created_at DESC';
    
    const items = await db.all(sql, params);
    
    // Parse images JSON and format response
    const formattedItems = items.map(item => ({
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      avgRating: item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '0.0',
      reviewCount: item.review_count || 0
    }));
    
    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await db.get(`
      SELECT 
        i.*,
        u.first_name as owner_name,
        u.last_name as owner_last_name,
        u.phone as owner_phone,
        AVG(r.rating) as avg_rating,
        COUNT(r.id) as review_count
      FROM items i
      LEFT JOIN users u ON i.owner_id = u.id
      LEFT JOIN reviews r ON i.id = r.item_id AND r.is_approved = 1
      WHERE i.id = ?
      GROUP BY i.id
    `, [id]);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Parse images JSON
    const formattedItem = {
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      avgRating: item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '0.0',
      reviewCount: item.review_count || 0
    };
    
    res.json({ item: formattedItem });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new item (authenticated users only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, pricePerDay, depositAmount, location, images } = req.body;
    
    // Validation
    if (!title || !category || !pricePerDay || !depositAmount || !location) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    
    if (pricePerDay <= 0 || depositAmount < 0) {
      return res.status(400).json({ error: 'Invalid price or deposit amount' });
    }
    
    // Create item
    const result = await db.run(`
      INSERT INTO items (owner_id, title, description, category, price_per_day, deposit_amount, location, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      title,
      description || '',
      category,
      pricePerDay,
      depositAmount,
      location,
      JSON.stringify(images || [])
    ]);
    
    // Get the created item
    const newItem = await db.get('SELECT * FROM items WHERE id = ?', [result.id]);
    
    res.status(201).json({
      message: 'Item created successfully',
      item: {
        ...newItem,
        images: JSON.parse(newItem.images || '[]')
      }
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, pricePerDay, depositAmount, location, images, isAvailable } = req.body;
    
    // Check if user owns this item
    const item = await db.get('SELECT owner_id FROM items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }
    
    // Update item
    await db.run(`
      UPDATE items 
      SET title = ?, description = ?, category = ?, price_per_day = ?, 
          deposit_amount = ?, location = ?, images = ?, is_available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      description,
      category,
      pricePerDay,
      depositAmount,
      location,
      JSON.stringify(images || []),
      isAvailable !== undefined ? isAvailable : true,
      id
    ]);
    
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns this item
    const item = await db.get('SELECT owner_id FROM items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }
    
    // Check if item has active bookings
    const activeBookings = await db.get(
      'SELECT id FROM bookings WHERE item_id = ? AND status IN ("pending", "approved")',
      [id]
    );
    
    if (activeBookings) {
      return res.status(400).json({ error: 'Cannot delete item with active bookings' });
    }
    
    // Delete item
    await db.run('DELETE FROM items WHERE id = ?', [id]);
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's items
router.get('/my/items', authenticateToken, async (req, res) => {
  try {
    const items = await db.all(`
      SELECT 
        i.*,
        COUNT(b.id) as booking_count,
        AVG(r.rating) as avg_rating
      FROM items i
      LEFT JOIN bookings b ON i.id = b.item_id
      LEFT JOIN reviews r ON i.id = r.item_id AND r.is_approved = 1
      WHERE i.owner_id = ?
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `, [req.user.id]);
    
    const formattedItems = items.map(item => ({
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      avgRating: item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '0.0',
      bookingCount: item.booking_count || 0
    }));
    
    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;