const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for review media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../frontend/public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed'));
  }
});

// Get reviews for an item
router.get('/item/:itemId', optionalAuth, async (req, res) => {
  try {
    const reviews = await db.allAsync(
      `SELECT r.*, u.full_name as user_name, u.is_verified as user_verified
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_id = ? AND r.is_flagged = 0
       ORDER BY r.created_at DESC`,
      [req.params.itemId]
    );
    
    // Parse media JSON
    const parsedReviews = reviews.map(review => ({
      ...review,
      media: review.media ? JSON.parse(review.media) : [],
      user_verified: review.user_verified === 1,
      is_verified: review.is_verified === 1
    }));
    
    res.json({ reviews: parsedReviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

// Create review
router.post('/', authenticate, upload.array('media', 5), async (req, res) => {
  try {
    const { itemId, bookingId, rating, comment } = req.body;
    
    if (!itemId || !rating) {
      return res.status(400).json({ error: 'Item ID and rating are required' });
    }
    
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if booking exists and is completed (or allow via query param for demo)
    if (bookingId) {
      const booking = await db.getAsync(
        'SELECT * FROM bookings WHERE id = ? AND renter_id = ?',
        [bookingId, req.user.id]
      );
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // For demo purposes, allow review if ?canReview=true or booking is completed
      const canReview = req.query.canReview === 'true' || booking.status === 'completed';
      
      if (!canReview) {
        return res.status(400).json({ error: 'Can only review completed bookings' });
      }
      
      // Check if already reviewed
      const existingReview = await db.getAsync(
        'SELECT id FROM reviews WHERE booking_id = ? AND user_id = ?',
        [bookingId, req.user.id]
      );
      
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this booking' });
      }
    }
    
    // Process uploaded media
    const mediaPaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    // Create review
    const result = await db.runAsync(
      `INSERT INTO reviews (item_id, booking_id, user_id, rating, comment, media)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        bookingId || null,
        req.user.id,
        ratingNum,
        comment || null,
        mediaPaths.length > 0 ? JSON.stringify(mediaPaths) : null
      ]
    );
    
    // Update item rating
    const stats = await db.getAsync(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE item_id = ? AND is_flagged = 0`,
      [itemId]
    );
    
    await db.runAsync(
      `UPDATE items SET rating = ?, review_count = ? WHERE id = ?`,
      [stats.avg_rating || 0, stats.count || 0, itemId]
    );
    
    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.lastID
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Error creating review' });
  }
});

// Get user's reviews
router.get('/my-reviews', authenticate, async (req, res) => {
  try {
    const reviews = await db.allAsync(
      `SELECT r.*, i.title as item_title, i.images as item_images
       FROM reviews r
       JOIN items i ON r.item_id = i.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    
    const parsedReviews = reviews.map(review => ({
      ...review,
      media: review.media ? JSON.parse(review.media) : [],
      item_images: review.item_images ? JSON.parse(review.item_images) : []
    }));
    
    res.json({ reviews: parsedReviews });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

// Update review
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const review = await db.getAsync(
      'SELECT * FROM reviews WHERE id = ?',
      [req.params.id]
    );
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }
    
    await db.runAsync(
      `UPDATE reviews SET
       rating = COALESCE(?, rating),
       comment = COALESCE(?, comment),
       updated_at = datetime('now')
       WHERE id = ?`,
      [rating, comment, req.params.id]
    );
    
    // Update item rating
    const stats = await db.getAsync(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE item_id = ? AND is_flagged = 0`,
      [review.item_id]
    );
    
    await db.runAsync(
      `UPDATE items SET rating = ?, review_count = ? WHERE id = ?`,
      [stats.avg_rating || 0, stats.count || 0, review.item_id]
    );
    
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Error updating review' });
  }
});

// Delete review
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await db.getAsync(
      'SELECT * FROM reviews WHERE id = ?',
      [req.params.id]
    );
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }
    
    await db.runAsync('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    
    // Update item rating
    const stats = await db.getAsync(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count
       FROM reviews WHERE item_id = ? AND is_flagged = 0`,
      [review.item_id]
    );
    
    await db.runAsync(
      `UPDATE items SET rating = ?, review_count = ? WHERE id = ?`,
      [stats.avg_rating || 0, stats.count || 0, review.item_id]
    );
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Error deleting review' });
  }
});

module.exports = router;
