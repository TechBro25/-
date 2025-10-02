const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalUsers: 0,
      totalItems: 0,
      totalBookings: 0,
      totalRevenue: 0,
      pendingBookings: 0,
      activeBookings: 0,
      pendingKyc: 0
    };
    
    const userCount = await db.getAsync('SELECT COUNT(*) as count FROM users');
    stats.totalUsers = userCount.count;
    
    const itemCount = await db.getAsync('SELECT COUNT(*) as count FROM items');
    stats.totalItems = itemCount.count;
    
    const bookingCount = await db.getAsync('SELECT COUNT(*) as count FROM bookings');
    stats.totalBookings = bookingCount.count;
    
    const revenue = await db.getAsync(
      'SELECT SUM(total_price) as total FROM bookings WHERE payment_status = "paid"'
    );
    stats.totalRevenue = revenue.total || 0;
    
    const pending = await db.getAsync(
      'SELECT COUNT(*) as count FROM bookings WHERE status = "pending"'
    );
    stats.pendingBookings = pending.count;
    
    const active = await db.getAsync(
      'SELECT COUNT(*) as count FROM bookings WHERE status = "active"'
    );
    stats.activeBookings = active.count;
    
    const kycPending = await db.getAsync(
      'SELECT COUNT(*) as count FROM kyc_documents WHERE status = "code_sent"'
    );
    stats.pendingKyc = kycPending.count;
    
    res.json({ stats });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT b.*, 
             i.title as item_title,
             o.full_name as owner_name, o.email as owner_email,
             r.full_name as renter_name, r.email as renter_email
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users o ON b.owner_id = o.id
      JOIN users r ON b.renter_id = r.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE b.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const bookings = await db.allAsync(query, params);
    
    res.json({ bookings });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
});

// Approve/reject booking
router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.runAsync(
      `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, req.params.id]
    );
    
    res.json({ message: 'Booking status updated' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Error updating booking' });
  }
});

// Get all messages (including WhatsApp)
router.get('/messages', async (req, res) => {
  try {
    const { channel, page = 1, limit = 100 } = req.query;
    
    let query = `
      SELECT m.*,
             sender.full_name as sender_name, sender.email as sender_email,
             receiver.full_name as receiver_name, receiver.email as receiver_email
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
    `;
    
    const params = [];
    
    if (channel) {
      query += ' WHERE m.channel = ?';
      params.push(channel);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const messages = await db.allAsync(query, params);
    
    res.json({ messages });
  } catch (error) {
    console.error('Get admin messages error:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Get KYC queue
router.get('/kyc', async (req, res) => {
  try {
    const { status = 'code_sent' } = req.query;
    
    const kycDocs = await db.allAsync(
      `SELECT k.*, u.full_name, u.email, u.phone
       FROM kyc_documents k
       JOIN users u ON k.user_id = u.id
       WHERE k.status = ?
       ORDER BY k.created_at DESC`,
      [status]
    );
    
    res.json({ kycDocuments: kycDocs });
  } catch (error) {
    console.error('Get KYC queue error:', error);
    res.status(500).json({ error: 'Error fetching KYC documents' });
  }
});

// Approve/reject KYC
router.patch('/kyc/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['verified', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const kyc = await db.getAsync(
      'SELECT user_id FROM kyc_documents WHERE id = ?',
      [req.params.id]
    );
    
    if (!kyc) {
      return res.status(404).json({ error: 'KYC document not found' });
    }
    
    await db.runAsync(
      `UPDATE kyc_documents 
       SET status = ?, verified_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [status, req.params.id]
    );
    
    if (status === 'verified') {
      await db.runAsync(
        'UPDATE users SET is_verified = 1 WHERE id = ?',
        [kyc.user_id]
      );
    }
    
    res.json({ message: 'KYC status updated' });
  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({ error: 'Error updating KYC' });
  }
});

// Get all reviews
router.get('/reviews', async (req, res) => {
  try {
    const { flagged = 'all', page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT r.*, 
             u.full_name as user_name, u.email as user_email,
             i.title as item_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN items i ON r.item_id = i.id
    `;
    
    const params = [];
    
    if (flagged === 'true') {
      query += ' WHERE r.is_flagged = 1';
    } else if (flagged === 'false') {
      query += ' WHERE r.is_flagged = 0';
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const reviews = await db.allAsync(query, params);
    
    // Parse media
    const parsedReviews = reviews.map(review => ({
      ...review,
      media: review.media ? JSON.parse(review.media) : []
    }));
    
    res.json({ reviews: parsedReviews });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

// Flag/unflag review
router.patch('/reviews/:id/flag', async (req, res) => {
  try {
    const { flagged } = req.body;
    
    await db.runAsync(
      'UPDATE reviews SET is_flagged = ? WHERE id = ?',
      [flagged ? 1 : 0, req.params.id]
    );
    
    res.json({ message: flagged ? 'Review flagged' : 'Review unflagged' });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ error: 'Error updating review' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, verified, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT id, email, full_name, phone, role, is_verified, created_at FROM users';
    const params = [];
    const conditions = [];
    
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    
    if (verified !== undefined) {
      conditions.push('is_verified = ?');
      params.push(verified === 'true' ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const users = await db.allAsync(query, params);
    
    res.json({ users });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get disputes
router.get('/disputes', async (req, res) => {
  try {
    const { status = 'open' } = req.query;
    
    const disputes = await db.allAsync(
      `SELECT d.*,
              u.full_name as raised_by_name, u.email as raised_by_email,
              b.id as booking_id,
              i.title as item_title
       FROM disputes d
       JOIN users u ON d.raised_by = u.id
       JOIN bookings b ON d.booking_id = b.id
       JOIN items i ON b.item_id = i.id
       WHERE d.status = ?
       ORDER BY d.created_at DESC`,
      [status]
    );
    
    res.json({ disputes });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Error fetching disputes' });
  }
});

module.exports = router;
