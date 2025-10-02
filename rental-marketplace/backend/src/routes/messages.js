const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Send inbox message
router.post('/inbox', authenticateToken, async (req, res) => {
  try {
    const { receiverId, bookingId, subject, body } = req.body;
    
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    
    // Create message
    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, booking_id, channel, subject, body)
      VALUES (?, ?, ?, 'inbox', ?, ?)
    `, [req.user.id, receiverId || null, bookingId || null, subject || 'Message', body]);
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageId: result.id
    });
  } catch (error) {
    console.error('Send inbox message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's messages
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { channel, bookingId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        m.*,
        sender.first_name as sender_name,
        sender.last_name as sender_last_name,
        receiver.first_name as receiver_name,
        receiver.last_name as receiver_last_name,
        b.item_id,
        i.title as item_title
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN bookings b ON m.booking_id = b.id
      LEFT JOIN items i ON b.item_id = i.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
    `;
    
    const params = [req.user.id, req.user.id];
    
    if (channel) {
      sql += ' AND m.channel = ?';
      params.push(channel);
    }
    
    if (bookingId) {
      sql += ' AND m.booking_id = ?';
      params.push(bookingId);
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const messages = await db.all(sql, params);
    
    // Mark messages as read
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await db.run(
        `UPDATE messages SET is_read = 1 WHERE id IN (${messageIds.map(() => '?').join(',')})`,
        messageIds
      );
    }
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    
    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp webhook endpoint (stub for testing)
router.post('/whatsapp-webhook', async (req, res) => {
  try {
    const { from, body, messageId } = req.body;
    
    console.log('📱 WhatsApp webhook received:', { from, body, messageId });
    
    // Store WhatsApp message in database
    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, channel, subject, body)
      VALUES (NULL, NULL, 'whatsapp', 'WhatsApp Message', ?)
    `, [body]);
    
    // Check if this is a verification code
    const verificationCodeMatch = body.match(/\b\d{6}\b/);
    if (verificationCodeMatch) {
      const code = verificationCodeMatch[0];
      
      // Find pending KYC with this code
      const kyc = await db.get(
        'SELECT * FROM kyc_documents WHERE verification_code = ? AND status = "pending"',
        [code]
      );
      
      if (kyc) {
        // Mark KYC as verified
        await db.run(
          'UPDATE kyc_documents SET status = "verified", verified_at = CURRENT_TIMESTAMP WHERE id = ?',
          [kyc.id]
        );
        
        // Mark user as verified
        await db.run(
          'UPDATE users SET is_verified = 1 WHERE id = ?',
          [kyc.user_id]
        );
        
        console.log(`✅ KYC verified for user ${kyc.user_id} with code ${code}`);
      }
    }
    
    res.json({ 
      status: 'success', 
      message: 'WhatsApp message processed',
      messageId: result.id 
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all messages
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { channel, page = 1, limit = 50 } = req.query;
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
    console.error('Get admin messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get WhatsApp messages specifically
router.get('/admin/whatsapp', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const messages = await db.all(`
      SELECT * FROM messages 
      WHERE channel = 'whatsapp' 
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.json({ messages });
  } catch (error) {
    console.error('Get WhatsApp messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;