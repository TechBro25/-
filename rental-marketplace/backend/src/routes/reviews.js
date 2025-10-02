const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get reviews for an item
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const reviews = await db.all(`
      SELECT 
        r.*,
        u.first_name as reviewer_name,
        u.last_name as reviewer_last_name,
        b.start_date,
        b.end_date
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.item_id = ? AND r.is_approved = 1
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [itemId, limit, offset]);
    
    // Get total count
    const totalResult = await db.get(
      'SELECT COUNT(*) as total FROM reviews WHERE item_id = ? AND is_approved = 1',
      [itemId]
    );
    
    const formattedReviews = reviews.map(review => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : [],
      videos: review.videos ? JSON.parse(review.videos) : []
    }));
    
    res.json({
      reviews: formattedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemId, bookingId, rating, title, comment, images, videos } = req.body;
    
    // Validation
    if (!itemId || !bookingId || !rating) {
      return res.status(400).json({ error: 'Item ID, booking ID, and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if booking exists and belongs to user
    const booking = await db.get(`
      SELECT 
        b.*,
        i.title as item_title
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      WHERE b.id = ? AND b.renter_id = ? AND b.item_id = ?
    `, [bookingId, req.user.id, itemId]);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }
    
    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }
    
    // Check if review already exists for this booking
    const existingReview = await db.get(
      'SELECT id FROM reviews WHERE booking_id = ?',
      [bookingId]
    );
    
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }
    
    // Create review
    const result = await db.run(`
      INSERT INTO reviews (item_id, booking_id, reviewer_id, rating, title, comment, images, videos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemId,
      bookingId,
      req.user.id,
      rating,
      title || '',
      comment || '',
      JSON.stringify(images || []),
      JSON.stringify(videos || [])
    ]);
    
    // Update item's average rating
    await db.run(`
      UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [itemId]);
    
    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.id
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's reviews
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const reviews = await db.all(`
      SELECT 
        r.*,
        i.title as item_title,
        i.images as item_images,
        b.start_date,
        b.end_date
      FROM reviews r
      JOIN items i ON r.item_id = i.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.reviewer_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    
    const formattedReviews = reviews.map(review => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : [],
      videos: review.videos ? JSON.parse(review.videos) : [],
      itemImages: review.item_images ? JSON.parse(review.item_images) : []
    }));
    
    res.json({ reviews: formattedReviews });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review (reviewer only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images, videos } = req.body;
    
    // Check if review exists and belongs to user
    const review = await db.get(
      'SELECT * FROM reviews WHERE id = ? AND reviewer_id = ?',
      [id, req.user.id]
    );
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }
    
    // Update review
    await db.run(`
      UPDATE reviews 
      SET rating = ?, title = ?, comment = ?, images = ?, videos = ?
      WHERE id = ?
    `, [
      rating,
      title,
      comment,
      JSON.stringify(images || []),
      JSON.stringify(videos || []),
      id
    ]);
    
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review (reviewer only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if review exists and belongs to user
    const review = await db.get(
      'SELECT * FROM reviews WHERE id = ? AND reviewer_id = ?',
      [id, req.user.id]
    );
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }
    
    // Delete review
    await db.run('DELETE FROM reviews WHERE id = ?', [id]);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all reviews for moderation
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        r.*,
        u.first_name as reviewer_name,
        u.last_name as reviewer_last_name,
        i.title as item_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN items i ON r.item_id = i.id
    `;
    
    const params = [];
    
    if (status === 'pending') {
      sql += ' WHERE r.is_approved = 0';
    } else if (status === 'approved') {
      sql += ' WHERE r.is_approved = 1';
    }
    
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const reviews = await db.all(sql, params);
    
    const formattedReviews = reviews.map(review => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : [],
      videos: review.videos ? JSON.parse(review.videos) : []
    }));
    
    res.json({ reviews: formattedReviews });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Approve/reject review
router.put('/:id/moderate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    
    // Check if review exists
    const review = await db.get('SELECT * FROM reviews WHERE id = ?', [id]);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Update review approval status
    await db.run(
      'UPDATE reviews SET is_approved = ? WHERE id = ?',
      [isApproved ? 1 : 0, id]
    );
    
    res.json({ message: `Review ${isApproved ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;