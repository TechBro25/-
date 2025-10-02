const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { processIncomingMessage, sendVerificationCode } = require('../utils/whatsappStub');

const router = express.Router();

// Get user's messages
router.get('/', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.query;
    
    let query, params;
    
    if (bookingId) {
      // Get messages for specific booking
      query = `
        SELECT m.*, 
               sender.full_name as sender_name,
               receiver.full_name as receiver_name
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        WHERE m.booking_id = ?
        AND (m.sender_id = ? OR m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `;
      params = [bookingId, req.user.id, req.user.id];
    } else {
      // Get all user's messages
      query = `
        SELECT m.*,
               sender.full_name as sender_name,
               receiver.full_name as receiver_name,
               b.id as booking_id,
               i.title as item_title
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN bookings b ON m.booking_id = b.id
        LEFT JOIN items i ON b.item_id = i.id
        WHERE m.sender_id = ? OR m.receiver_id = ?
        ORDER BY m.created_at DESC
      `;
      params = [req.user.id, req.user.id];
    }
    
    const messages = await db.allAsync(query, params);
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Send inbox message
router.post('/', authenticate, async (req, res) => {
  try {
    const { bookingId, receiverId, subject, body } = req.body;
    
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    
    // If booking is specified, validate it
    if (bookingId) {
      const booking = await db.getAsync(
        'SELECT * FROM bookings WHERE id = ?',
        [bookingId]
      );
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Must be either renter or owner of the booking
      if (booking.renter_id !== req.user.id && booking.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to message on this booking' });
      }
      
      // Auto-determine receiver
      const autoReceiverId = booking.renter_id === req.user.id ? booking.owner_id : booking.renter_id;
      
      await db.runAsync(
        `INSERT INTO messages (booking_id, sender_id, receiver_id, channel, subject, body)
         VALUES (?, ?, ?, 'inbox', ?, ?)`,
        [bookingId, req.user.id, autoReceiverId, subject || null, body]
      );
    } else {
      // General message (not tied to booking)
      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required for general messages' });
      }
      
      await db.runAsync(
        `INSERT INTO messages (sender_id, receiver_id, channel, subject, body)
         VALUES (?, ?, 'inbox', ?, ?)`,
        [req.user.id, receiverId, subject || null, body]
      );
    }
    
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// Mark message as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await db.getAsync(
      'SELECT * FROM messages WHERE id = ?',
      [req.params.id]
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only receiver can mark as read
    if (message.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await db.runAsync(
      'UPDATE messages SET is_read = 1 WHERE id = ?',
      [req.params.id]
    );
    
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Error updating message' });
  }
});

// WhatsApp webhook - receive messages from WhatsApp
router.post('/whatsapp-webhook', async (req, res) => {
  try {
    const { from, body, messageId } = req.body;
    
    if (!from || !body) {
      return res.status(400).json({ error: 'From and body are required' });
    }
    
    // Process the incoming message
    const result = await processIncomingMessage(from, body, messageId);
    
    res.json(result);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Error processing WhatsApp message' });
  }
});

// Request KYC verification code
router.post('/verification/request', authenticate, async (req, res) => {
  try {
    if (!req.user.phone) {
      return res.status(400).json({ error: 'Phone number required for verification' });
    }
    
    // Check if already verified
    if (req.user.is_verified) {
      return res.status(400).json({ error: 'User already verified' });
    }
    
    // Send verification code via WhatsApp
    const result = await sendVerificationCode(req.user.id, req.user.phone);
    
    res.json({
      message: result.message,
      whatsappNumber: '091-546-09327'
    });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({ error: 'Error requesting verification' });
  }
});

// Check verification status
router.get('/verification/status', authenticate, async (req, res) => {
  try {
    const kyc = await db.getAsync(
      'SELECT * FROM kyc_documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    res.json({
      isVerified: req.user.is_verified === 1,
      kycStatus: kyc ? kyc.status : 'none',
      verifiedAt: kyc ? kyc.verified_at : null
    });
  } catch (error) {
    console.error('Check verification error:', error);
    res.status(500).json({ error: 'Error checking verification status' });
  }
});

module.exports = router;
