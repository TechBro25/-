const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendKYCVerificationCode } = require('../utils/whatsappStub');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      totalBookings,
      pendingBookings,
      totalReviews,
      pendingReviews,
      unreadMessages,
      pendingKYC
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM items'),
      db.get('SELECT COUNT(*) as count FROM bookings'),
      db.get('SELECT COUNT(*) as count FROM bookings WHERE status = "pending"'),
      db.get('SELECT COUNT(*) as count FROM reviews'),
      db.get('SELECT COUNT(*) as count FROM reviews WHERE is_approved = 0'),
      db.get('SELECT COUNT(*) as count FROM messages WHERE is_read = 0'),
      db.get('SELECT COUNT(*) as count FROM kyc_documents WHERE status = "pending"')
    ]);

    res.json({
      stats: {
        totalUsers: totalUsers.count,
        totalItems: totalItems.count,
        totalBookings: totalBookings.count,
        pendingBookings: pendingBookings.count,
        totalReviews: totalReviews.count,
        pendingReviews: pendingReviews.count,
        unreadMessages: unreadMessages.count,
        pendingKYC: pendingKYC.count
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, verified } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT id, email, first_name, last_name, phone, is_admin, is_verified, created_at FROM users';
    const params = [];
    
    if (verified !== undefined) {
      sql += ' WHERE is_verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const users = await db.all(sql, params);
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all items
router.get('/items', async (req, res) => {
  try {
    const { page = 1, limit = 20, available } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        i.*,
        u.first_name as owner_name,
        u.last_name as owner_last_name,
        COUNT(b.id) as booking_count
      FROM items i
      JOIN users u ON i.owner_id = u.id
      LEFT JOIN bookings b ON i.id = b.item_id
    `;
    const params = [];
    
    if (available !== undefined) {
      sql += ' WHERE i.is_available = ?';
      params.push(available === 'true' ? 1 : 0);
    }
    
    sql += ' GROUP BY i.id ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const items = await db.all(sql, params);
    
    const formattedItems = items.map(item => ({
      ...item,
      images: item.images ? JSON.parse(item.images) : []
    }));
    
    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        b.*,
        i.title as item_title,
        i.images as item_images,
        owner.first_name as owner_name,
        owner.last_name as owner_last_name,
        renter.first_name as renter_name,
        renter.last_name as renter_last_name
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users owner ON i.owner_id = owner.id
      JOIN users renter ON b.renter_id = renter.id
    `;
    const params = [];
    
    if (status) {
      sql += ' WHERE b.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const bookings = await db.all(sql, params);
    
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      itemImages: booking.item_images ? JSON.parse(booking.item_images) : []
    }));
    
    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update booking status
    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get KYC documents
router.get('/kyc', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    
    const kycDocs = await db.all(`
      SELECT 
        k.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM kyc_documents k
      JOIN users u ON k.user_id = u.id
      WHERE k.status = ?
      ORDER BY k.created_at DESC
    `, [status]);
    
    res.json({ kycDocuments: kycDocs });
  } catch (error) {
    console.error('Get KYC documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve KYC document
router.put('/kyc/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update KYC status
    await db.run(
      'UPDATE kyc_documents SET status = "verified", verified_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    // Get user ID and mark as verified
    const kyc = await db.get('SELECT user_id FROM kyc_documents WHERE id = ?', [id]);
    await db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [kyc.user_id]);
    
    res.json({ message: 'KYC document approved successfully' });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject KYC document
router.put('/kyc/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Update KYC status
    await db.run(
      'UPDATE kyc_documents SET status = "rejected" WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'KYC document rejected successfully' });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send KYC verification code
router.post('/kyc/:id/send-code', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get KYC document and user info
    const kyc = await db.get(`
      SELECT k.*, u.phone, u.first_name, u.last_name
      FROM kyc_documents k
      JOIN users u ON k.user_id = u.id
      WHERE k.id = ?
    `, [id]);
    
    if (!kyc) {
      return res.status(404).json({ error: 'KYC document not found' });
    }
    
    if (!kyc.phone) {
      return res.status(400).json({ error: 'User phone number not available' });
    }
    
    // Send verification code
    const result = await sendKYCVerificationCode(kyc.user_id, kyc.phone);
    
    if (result.success) {
      res.json({ 
        message: 'Verification code sent successfully',
        code: result.code // Only for testing - remove in production
      });
    } else {
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  } catch (error) {
    console.error('Send KYC code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reviews for moderation
router.get('/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20, approved } = req.query;
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
    
    if (approved !== undefined) {
      sql += ' WHERE r.is_approved = ?';
      params.push(approved === 'true' ? 1 : 0);
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
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Moderate review
router.put('/reviews/:id/moderate', async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    
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

// Delete review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete review
    await db.run('DELETE FROM reviews WHERE id = ?', [id]);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages
router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 50, channel } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        m.*,
        sender.first_name as sender_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        receiver.first_name as receiver_name,
        receiver.last_name as receiver_last_name,
        receiver.email as receiver_email,
        b.item_id,
        i.title as item_title
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN bookings b ON m.booking_id = b.id
      LEFT JOIN items i ON b.item_id = i.id
    `;
    const params = [];
    
    if (channel) {
      sql += ' WHERE m.channel = ?';
      params.push(channel);
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const messages = await db.all(sql, params);
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin user (for initial setup)
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if admin already exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE is_admin = 1');
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const result = await db.run(`
      INSERT INTO users (email, password_hash, first_name, last_name, is_admin, is_verified)
      VALUES (?, ?, ?, ?, 1, 1)
    `, [email, passwordHash, firstName, lastName]);
    
    res.status(201).json({
      message: 'Admin user created successfully',
      adminId: result.id
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;