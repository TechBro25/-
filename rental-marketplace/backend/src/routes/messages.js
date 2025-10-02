const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleWhatsAppWebhook, generateWhatsAppLink } = require('../utils/whatsappStub');

const router = express.Router();

// Send inbox message
router.post('/', authenticateToken, [
  body('recipientId').optional().isInt({ min: 1 }),
  body('bookingId').optional().isInt({ min: 1 }),
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('subject').optional().trim().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId, bookingId, message, subject } = req.body;
    const db = req.app.locals.db;
    const senderId = req.user.id;

    let finalRecipientId = recipientId;

    // If booking ID is provided, determine recipient from booking
    if (bookingId && !recipientId) {
      const bookings = await db.query(
        'SELECT owner_id, renter_id FROM bookings WHERE id = ?',
        [bookingId]
      );

      if (bookings.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookings[0];
      // Recipient is the other party in the booking
      finalRecipientId = booking.owner_id === senderId ? booking.renter_id : booking.owner_id;
    }

    // If no recipient specified, send to admin (support)
    if (!finalRecipientId) {
      const admins = await db.query('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
      if (admins.length > 0) {
        finalRecipientId = admins[0].id;
      } else {
        return res.status(400).json({ error: 'No recipient specified and no admin found' });
      }
    }

    // Create message
    const fullMessage = subject ? `${subject}\n\n${message}` : message;
    
    const result = await db.run(`
      INSERT INTO messages (booking_id, sender_id, recipient_id, channel, message_text)
      VALUES (?, ?, ?, ?, ?)
    `, [bookingId, senderId, finalRecipientId, 'inbox', fullMessage]);

    // Get the created message with sender details
    const messageQuery = `
      SELECT 
        messages.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name
      FROM messages
      JOIN users sender ON messages.sender_id = sender.id
      JOIN users recipient ON messages.recipient_id = recipient.id
      WHERE messages.id = ?
    `;

    const newMessage = await db.query(messageQuery, [result.id]);
    const messageData = newMessage[0];

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        ...messageData,
        sender_name: `${messageData.sender_first_name} ${messageData.sender_last_name}`,
        recipient_name: `${messageData.recipient_first_name} ${messageData.recipient_last_name}`
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get user's messages
router.get('/', authenticateToken, [
  query('bookingId').optional().isInt({ min: 1 }),
  query('channel').optional().isIn(['inbox', 'whatsapp']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId, channel, page = 1, limit = 20 } = req.query;
    const db = req.app.locals.db;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let whereConditions = ['(messages.sender_id = ? OR messages.recipient_id = ?)'];
    let queryParams = [userId, userId];

    if (bookingId) {
      whereConditions.push('messages.booking_id = ?');
      queryParams.push(bookingId);
    }

    if (channel) {
      whereConditions.push('messages.channel = ?');
      queryParams.push(channel);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const messagesQuery = `
      SELECT 
        messages.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        bookings.id as booking_exists
      FROM messages
      LEFT JOIN users sender ON messages.sender_id = sender.id
      LEFT JOIN users recipient ON messages.recipient_id = recipient.id
      LEFT JOIN bookings ON messages.booking_id = bookings.id
      ${whereClause}
      ORDER BY messages.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await db.query(messagesQuery, [...queryParams, limit, offset]);

    // Mark messages as read where user is recipient
    if (messages.length > 0) {
      const messageIds = messages
        .filter(msg => msg.recipient_id === userId && !msg.is_read)
        .map(msg => msg.id);

      if (messageIds.length > 0) {
        await db.run(
          `UPDATE messages SET is_read = 1 WHERE id IN (${messageIds.map(() => '?').join(',')})`,
          messageIds
        );
      }
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages
      LEFT JOIN bookings ON messages.booking_id = bookings.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    const formattedMessages = messages.map(msg => ({
      ...msg,
      sender_name: msg.sender_first_name ? 
        `${msg.sender_first_name} ${msg.sender_last_name}` : 
        'System',
      recipient_name: msg.recipient_first_name ? 
        `${msg.recipient_first_name} ${msg.recipient_last_name}` : 
        'System',
      is_sender: msg.sender_id === userId,
      is_recipient: msg.recipient_id === userId
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get message threads (conversations grouped by booking or participants)
router.get('/threads', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const db = req.app.locals.db;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // Get conversation threads
    const threadsQuery = `
      SELECT 
        CASE 
          WHEN messages.booking_id IS NOT NULL THEN CONCAT('booking_', messages.booking_id)
          ELSE CONCAT('user_', CASE WHEN messages.sender_id = ? THEN messages.recipient_id ELSE messages.sender_id END)
        END as thread_id,
        messages.booking_id,
        CASE WHEN messages.sender_id = ? THEN messages.recipient_id ELSE messages.sender_id END as other_user_id,
        MAX(messages.created_at) as last_message_time,
        COUNT(*) as message_count,
        SUM(CASE WHEN messages.recipient_id = ? AND messages.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        (SELECT message_text FROM messages m2 WHERE 
          (m2.booking_id = messages.booking_id OR 
           (m2.booking_id IS NULL AND messages.booking_id IS NULL AND 
            ((m2.sender_id = ? AND m2.recipient_id = other_user_id) OR 
             (m2.recipient_id = ? AND m2.sender_id = other_user_id))))
          AND (m2.sender_id = ? OR m2.recipient_id = ?)
          ORDER BY m2.created_at DESC LIMIT 1
        ) as last_message,
        users.first_name as other_user_first_name,
        users.last_name as other_user_last_name,
        items.title as item_title
      FROM messages
      LEFT JOIN users ON users.id = CASE WHEN messages.sender_id = ? THEN messages.recipient_id ELSE messages.sender_id END
      LEFT JOIN bookings ON messages.booking_id = bookings.id
      LEFT JOIN items ON bookings.item_id = items.id
      WHERE messages.sender_id = ? OR messages.recipient_id = ?
      GROUP BY thread_id, messages.booking_id, other_user_id
      ORDER BY last_message_time DESC
      LIMIT ? OFFSET ?
    `;

    const threads = await db.query(threadsQuery, [
      userId, userId, userId, userId, userId, userId, userId, 
      userId, userId, userId, limit, offset
    ]);

    const formattedThreads = threads.map(thread => ({
      ...thread,
      other_user_name: thread.other_user_first_name ? 
        `${thread.other_user_first_name} ${thread.other_user_last_name}` : 
        'Unknown User',
      thread_title: thread.item_title || 
        `Conversation with ${thread.other_user_first_name} ${thread.other_user_last_name}`
    }));

    res.json({ threads: formattedThreads });

  } catch (error) {
    console.error('Get message threads error:', error);
    res.status(500).json({ error: 'Failed to fetch message threads' });
  }
});

// WhatsApp webhook endpoint (for receiving messages)
router.post('/whatsapp-webhook', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await handleWhatsAppWebhook(req, res, db);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Generate WhatsApp support link
router.get('/whatsapp-link', (req, res) => {
  try {
    const { message = 'Hello, I need help with the rental marketplace.' } = req.query;
    const link = generateWhatsAppLink(message);
    
    res.json({ 
      whatsappLink: link,
      number: process.env.WHATSAPP_NUMBER || '09154609327'
    });

  } catch (error) {
    console.error('Generate WhatsApp link error:', error);
    res.status(500).json({ error: 'Failed to generate WhatsApp link' });
  }
});

// Admin: Get all messages (admin only)
router.get('/admin/all', requireAdmin, [
  query('channel').optional().isIn(['inbox', 'whatsapp']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { channel, page = 1, limit = 50 } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (channel) {
      whereConditions.push('messages.channel = ?');
      queryParams.push(channel);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const messagesQuery = `
      SELECT 
        messages.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        bookings.id as booking_id,
        items.title as item_title
      FROM messages
      LEFT JOIN users sender ON messages.sender_id = sender.id
      LEFT JOIN users recipient ON messages.recipient_id = recipient.id
      LEFT JOIN bookings ON messages.booking_id = bookings.id
      LEFT JOIN items ON bookings.item_id = items.id
      ${whereClause}
      ORDER BY messages.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await db.query(messagesQuery, [...queryParams, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    const formattedMessages = messages.map(msg => ({
      ...msg,
      sender_name: msg.sender_first_name ? 
        `${msg.sender_first_name} ${msg.sender_last_name}` : 
        'System',
      recipient_name: msg.recipient_first_name ? 
        `${msg.recipient_first_name} ${msg.recipient_last_name}` : 
        'System'
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;