const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, optionalAuth, requireVerified } = require('../middleware/auth');

const router = express.Router();

// Get all items with optional filtering and pagination
router.get('/', [
  query('category').optional().trim(),
  query('search').optional().trim(),
  query('location').optional().trim(),
  query('minPrice').optional().isNumeric(),
  query('maxPrice').optional().isNumeric(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category,
      search,
      location,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12
    } = req.query;

    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = ['items.is_available = 1'];
    let queryParams = [];

    if (category) {
      whereConditions.push('items.category = ?');
      queryParams.push(category);
    }

    if (search) {
      whereConditions.push('(items.title LIKE ? OR items.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      whereConditions.push('items.location LIKE ?');
      queryParams.push(`%${location}%`);
    }

    if (minPrice) {
      whereConditions.push('items.price_per_day >= ?');
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('items.price_per_day <= ?');
      queryParams.push(maxPrice);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get items with owner info and average rating
    const itemsQuery = `
      SELECT 
        items.*,
        users.first_name as owner_first_name,
        users.last_name as owner_last_name,
        users.is_verified as owner_verified,
        COALESCE(AVG(reviews.rating), 0) as avg_rating,
        COUNT(reviews.id) as review_count
      FROM items 
      JOIN users ON items.owner_id = users.id
      LEFT JOIN reviews ON items.id = reviews.item_id AND reviews.is_flagged = 0
      ${whereClause}
      GROUP BY items.id
      ORDER BY items.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = await db.query(itemsQuery, [...queryParams, limit, offset]);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT items.id) as total
      FROM items 
      JOIN users ON items.owner_id = users.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Parse images JSON for each item
    const itemsWithParsedImages = items.map(item => ({
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      avg_rating: parseFloat(item.avg_rating) || 0,
      owner_name: `${item.owner_first_name} ${item.owner_last_name}`
    }));

    res.json({
      items: itemsWithParsedImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    // Get item with owner info and reviews
    const itemQuery = `
      SELECT 
        items.*,
        users.first_name as owner_first_name,
        users.last_name as owner_last_name,
        users.email as owner_email,
        users.phone as owner_phone,
        users.is_verified as owner_verified,
        COALESCE(AVG(reviews.rating), 0) as avg_rating,
        COUNT(reviews.id) as review_count
      FROM items 
      JOIN users ON items.owner_id = users.id
      LEFT JOIN reviews ON items.id = reviews.item_id AND reviews.is_flagged = 0
      WHERE items.id = ?
      GROUP BY items.id
    `;

    const items = await db.query(itemQuery, [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    // Get reviews for this item
    const reviewsQuery = `
      SELECT 
        reviews.*,
        users.first_name,
        users.last_name,
        users.is_verified as reviewer_verified
      FROM reviews 
      JOIN users ON reviews.reviewer_id = users.id
      WHERE reviews.item_id = ? AND reviews.is_flagged = 0
      ORDER BY reviews.created_at DESC
    `;

    const reviews = await db.query(reviewsQuery, [id]);

    // Parse images for item and reviews
    const itemWithDetails = {
      ...item,
      images: item.images ? JSON.parse(item.images) : [],
      avg_rating: parseFloat(item.avg_rating) || 0,
      owner_name: `${item.owner_first_name} ${item.owner_last_name}`,
      reviews: reviews.map(review => ({
        ...review,
        images: review.images ? JSON.parse(review.images) : [],
        reviewer_name: `${review.first_name} ${review.last_name}`
      }))
    };

    res.json({ item: itemWithDetails });

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item (authenticated users only)
router.post('/', authenticateToken, requireVerified, [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').trim().isLength({ min: 1 }),
  body('pricePerDay').isNumeric({ min: 0 }),
  body('depositAmount').optional().isNumeric({ min: 0 }),
  body('location').trim().isLength({ min: 1 }),
  body('images').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      pricePerDay,
      depositAmount = 0,
      location,
      images = []
    } = req.body;

    const db = req.app.locals.db;
    const ownerId = req.user.id;

    // Create item
    const result = await db.run(
      `INSERT INTO items (owner_id, title, description, category, price_per_day, deposit_amount, location, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, title, description, category, pricePerDay, depositAmount, location, JSON.stringify(images)]
    );

    // Get the created item
    const newItem = await db.query('SELECT * FROM items WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Item created successfully',
      item: {
        ...newItem[0],
        images: JSON.parse(newItem[0].images || '[]')
      }
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item (owner only)
router.put('/:id', authenticateToken, requireVerified, [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().trim().isLength({ min: 1 }),
  body('pricePerDay').optional().isNumeric({ min: 0 }),
  body('depositAmount').optional().isNumeric({ min: 0 }),
  body('location').optional().trim().isLength({ min: 1 }),
  body('images').optional().isArray(),
  body('isAvailable').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Check if item exists and user is owner
    const items = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];
    if (item.owner_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }

    const updateFields = [];
    const updateValues = [];

    // Build dynamic update query
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        switch (key) {
          case 'title':
            updateFields.push('title = ?');
            updateValues.push(req.body[key]);
            break;
          case 'description':
            updateFields.push('description = ?');
            updateValues.push(req.body[key]);
            break;
          case 'category':
            updateFields.push('category = ?');
            updateValues.push(req.body[key]);
            break;
          case 'pricePerDay':
            updateFields.push('price_per_day = ?');
            updateValues.push(req.body[key]);
            break;
          case 'depositAmount':
            updateFields.push('deposit_amount = ?');
            updateValues.push(req.body[key]);
            break;
          case 'location':
            updateFields.push('location = ?');
            updateValues.push(req.body[key]);
            break;
          case 'images':
            updateFields.push('images = ?');
            updateValues.push(JSON.stringify(req.body[key]));
            break;
          case 'isAvailable':
            updateFields.push('is_available = ?');
            updateValues.push(req.body[key]);
            break;
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Update item
    await db.run(
      `UPDATE items SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated item
    const updatedItems = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    const updatedItem = updatedItems[0];

    res.json({
      message: 'Item updated successfully',
      item: {
        ...updatedItem,
        images: JSON.parse(updatedItem.images || '[]')
      }
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Check if item exists and user is owner
    const items = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];
    if (item.owner_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

    // Check for active bookings
    const activeBookings = await db.query(
      'SELECT id FROM bookings WHERE item_id = ? AND status IN (?, ?)',
      [id, 'approved', 'active']
    );

    if (activeBookings.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with active bookings' 
      });
    }

    // Delete item
    await db.run('DELETE FROM items WHERE id = ?', [id]);

    res.json({ message: 'Item deleted successfully' });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    const categories = await db.query(`
      SELECT category, COUNT(*) as count 
      FROM items 
      WHERE is_available = 1 
      GROUP BY category 
      ORDER BY count DESC
    `);

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;