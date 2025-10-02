const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireVerified, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get reviews for an item
router.get('/', [
  query('itemId').optional().isInt({ min: 1 }),
  query('userId').optional().isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, userId, page = 1, limit = 10 } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = ['reviews.is_flagged = 0'];
    let queryParams = [];

    if (itemId) {
      whereConditions.push('reviews.item_id = ?');
      queryParams.push(itemId);
    }

    if (userId) {
      whereConditions.push('reviews.reviewer_id = ?');
      queryParams.push(userId);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const reviewsQuery = `
      SELECT 
        reviews.*,
        users.first_name,
        users.last_name,
        users.is_verified as reviewer_verified,
        items.title as item_title,
        items.images as item_images
      FROM reviews
      JOIN users ON reviews.reviewer_id = users.id
      JOIN items ON reviews.item_id = items.id
      ${whereClause}
      ORDER BY reviews.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const reviews = await db.query(reviewsQuery, [...queryParams, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews
      JOIN users ON reviews.reviewer_id = users.id
      JOIN items ON reviews.item_id = items.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    const formattedReviews = reviews.map(review => ({
      ...review,
      images: JSON.parse(review.images || '[]'),
      item_images: JSON.parse(review.item_images || '[]'),
      reviewer_name: `${review.first_name} ${review.last_name}`
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review (authenticated users only, must have completed booking)
router.post('/', authenticateToken, requireVerified, [
  body('bookingId').isInt({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 }),
  body('images').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId, rating, comment, images = [] } = req.body;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Get booking details
    const bookings = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND renter_id = ?',
      [bookingId, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }

    const booking = bookings[0];

    // Check if booking is completed (or allow demo with query param)
    const allowDemo = req.query.demo === 'true';
    if (!allowDemo && booking.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Can only review completed bookings' 
      });
    }

    // Check if review already exists
    const existingReviews = await db.query(
      'SELECT id FROM reviews WHERE booking_id = ?',
      [bookingId]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }

    // Create review
    const result = await db.run(`
      INSERT INTO reviews (booking_id, item_id, reviewer_id, rating, comment, images, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [bookingId, booking.item_id, userId, rating, comment, JSON.stringify(images), req.user.is_verified]);

    // Get the created review with details
    const reviewQuery = `
      SELECT 
        reviews.*,
        users.first_name,
        users.last_name,
        users.is_verified as reviewer_verified,
        items.title as item_title
      FROM reviews
      JOIN users ON reviews.reviewer_id = users.id
      JOIN items ON reviews.item_id = items.id
      WHERE reviews.id = ?
    `;

    const newReview = await db.query(reviewQuery, [result.id]);
    const review = newReview[0];

    res.status(201).json({
      message: 'Review created successfully',
      review: {
        ...review,
        images: JSON.parse(review.images || '[]'),
        reviewer_name: `${review.first_name} ${review.last_name}`
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review (reviewer only)
router.put('/:id', authenticateToken, [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 }),
  body('images').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment, images } = req.body;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Get review
    const reviews = await db.query('SELECT * FROM reviews WHERE id = ?', [id]);
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviews[0];

    // Check if user is reviewer or admin
    if (review.reviewer_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }

    const updateFields = [];
    const updateValues = [];

    if (rating !== undefined) {
      updateFields.push('rating = ?');
      updateValues.push(rating);
    }

    if (comment !== undefined) {
      updateFields.push('comment = ?');
      updateValues.push(comment);
    }

    if (images !== undefined) {
      updateFields.push('images = ?');
      updateValues.push(JSON.stringify(images));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Update review
    await db.run(
      `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated review
    const updatedReviews = await db.query(`
      SELECT 
        reviews.*,
        users.first_name,
        users.last_name,
        users.is_verified as reviewer_verified,
        items.title as item_title
      FROM reviews
      JOIN users ON reviews.reviewer_id = users.id
      JOIN items ON reviews.item_id = items.id
      WHERE reviews.id = ?
    `, [id]);

    const updatedReview = updatedReviews[0];

    res.json({
      message: 'Review updated successfully',
      review: {
        ...updatedReview,
        images: JSON.parse(updatedReview.images || '[]'),
        reviewer_name: `${updatedReview.first_name} ${updatedReview.last_name}`
      }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review (reviewer only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Get review
    const reviews = await db.query('SELECT * FROM reviews WHERE id = ?', [id]);
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviews[0];

    // Check if user is reviewer or admin
    if (review.reviewer_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    // Delete review
    await db.run('DELETE FROM reviews WHERE id = ?', [id]);

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Flag review (authenticated users)
router.post('/:id/flag', authenticateToken, [
  body('reason').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const db = req.app.locals.db;

    // Check if review exists
    const reviews = await db.query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Flag review (in a real system, you might want to track who flagged it)
    await db.run(
      'UPDATE reviews SET is_flagged = 1 WHERE id = ?',
      [id]
    );

    // Log the flag reason (you could create a separate flags table)
    console.log(`Review ${id} flagged by user ${req.user.id}: ${reason}`);

    res.json({ message: 'Review flagged for moderation' });

  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

module.exports = router;