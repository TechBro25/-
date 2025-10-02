const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireVerified } = require('../middleware/auth');
const { sendBookingNotification } = require('../utils/whatsappStub');

const router = express.Router();

// Create new booking
router.post('/', authenticateToken, requireVerified, [
  body('itemId').isInt({ min: 1 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('message').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, startDate, endDate, message } = req.body;
    const db = req.app.locals.db;
    const renterId = req.user.id;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Get item details
    const items = await db.query('SELECT * FROM items WHERE id = ? AND is_available = 1', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found or not available' });
    }

    const item = items[0];

    // Check if user is trying to rent their own item
    if (item.owner_id === renterId) {
      return res.status(400).json({ error: 'Cannot rent your own item' });
    }

    // Check for conflicting bookings
    const conflictingBookings = await db.query(`
      SELECT id FROM bookings 
      WHERE item_id = ? 
      AND status IN ('approved', 'active') 
      AND (
        (start_date <= ? AND end_date > ?) OR
        (start_date < ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
      )
    `, [itemId, startDate, startDate, endDate, endDate, startDate, endDate]);

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ error: 'Item is not available for the selected dates' });
    }

    // Calculate total amount
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = days * item.price_per_day;

    // Create booking
    const result = await db.run(`
      INSERT INTO bookings (item_id, renter_id, owner_id, start_date, end_date, total_amount, deposit_amount, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [itemId, renterId, item.owner_id, startDate, endDate, totalAmount, item.deposit_amount, 'pending', 'pending']);

    // Create initial message if provided
    if (message) {
      await db.run(`
        INSERT INTO messages (booking_id, sender_id, recipient_id, channel, message_text)
        VALUES (?, ?, ?, ?, ?)
      `, [result.id, renterId, item.owner_id, 'inbox', message]);
    }

    // Send notification to owner (stub)
    const owner = await db.query('SELECT * FROM users WHERE id = ?', [item.owner_id]);
    if (owner.length > 0 && owner[0].phone) {
      await sendBookingNotification(owner[0].phone, {
        itemTitle: item.title,
        startDate,
        endDate,
        status: 'pending',
        totalAmount
      });
    }

    // Get the created booking with item details
    const bookingQuery = `
      SELECT 
        bookings.*,
        items.title as item_title,
        items.images as item_images,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        renter.first_name as renter_first_name,
        renter.last_name as renter_last_name
      FROM bookings
      JOIN items ON bookings.item_id = items.id
      JOIN users owner ON bookings.owner_id = owner.id
      JOIN users renter ON bookings.renter_id = renter.id
      WHERE bookings.id = ?
    `;

    const newBooking = await db.query(bookingQuery, [result.id]);
    const booking = newBooking[0];

    res.status(201).json({
      message: 'Booking request created successfully',
      booking: {
        ...booking,
        item_images: JSON.parse(booking.item_images || '[]'),
        owner_name: `${booking.owner_first_name} ${booking.owner_last_name}`,
        renter_name: `${booking.renter_first_name} ${booking.renter_last_name}`
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get user's bookings
router.get('/', authenticateToken, [
  query('status').optional().trim(),
  query('role').optional().isIn(['renter', 'owner']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, role, page = 1, limit = 10 } = req.query;
    const db = req.app.locals.db;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (role === 'renter') {
      whereConditions.push('bookings.renter_id = ?');
      queryParams.push(userId);
    } else if (role === 'owner') {
      whereConditions.push('bookings.owner_id = ?');
      queryParams.push(userId);
    } else {
      whereConditions.push('(bookings.renter_id = ? OR bookings.owner_id = ?)');
      queryParams.push(userId, userId);
    }

    if (status) {
      whereConditions.push('bookings.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get bookings with item and user details
    const bookingsQuery = `
      SELECT 
        bookings.*,
        items.title as item_title,
        items.images as item_images,
        items.category as item_category,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.phone as owner_phone,
        renter.first_name as renter_first_name,
        renter.last_name as renter_last_name,
        renter.phone as renter_phone
      FROM bookings
      JOIN items ON bookings.item_id = items.id
      JOIN users owner ON bookings.owner_id = owner.id
      JOIN users renter ON bookings.renter_id = renter.id
      ${whereClause}
      ORDER BY bookings.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const bookings = await db.query(bookingsQuery, [...queryParams, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Format bookings
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      item_images: JSON.parse(booking.item_images || '[]'),
      owner_name: `${booking.owner_first_name} ${booking.owner_last_name}`,
      renter_name: `${booking.renter_first_name} ${booking.renter_last_name}`,
      is_owner: booking.owner_id === userId,
      is_renter: booking.renter_id === userId
    }));

    res.json({
      bookings: formattedBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const userId = req.user.id;

    const bookingQuery = `
      SELECT 
        bookings.*,
        items.title as item_title,
        items.description as item_description,
        items.images as item_images,
        items.category as item_category,
        items.location as item_location,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.email as owner_email,
        owner.phone as owner_phone,
        renter.first_name as renter_first_name,
        renter.last_name as renter_last_name,
        renter.email as renter_email,
        renter.phone as renter_phone
      FROM bookings
      JOIN items ON bookings.item_id = items.id
      JOIN users owner ON bookings.owner_id = owner.id
      JOIN users renter ON bookings.renter_id = renter.id
      WHERE bookings.id = ?
    `;

    const bookings = await db.query(bookingQuery, [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if user is involved in this booking
    if (booking.owner_id !== userId && booking.renter_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    // Get messages for this booking
    const messagesQuery = `
      SELECT 
        messages.*,
        users.first_name,
        users.last_name
      FROM messages
      LEFT JOIN users ON messages.sender_id = users.id
      WHERE messages.booking_id = ?
      ORDER BY messages.created_at ASC
    `;

    const messages = await db.query(messagesQuery, [id]);

    res.json({
      booking: {
        ...booking,
        item_images: JSON.parse(booking.item_images || '[]'),
        owner_name: `${booking.owner_first_name} ${booking.owner_last_name}`,
        renter_name: `${booking.renter_first_name} ${booking.renter_last_name}`,
        is_owner: booking.owner_id === userId,
        is_renter: booking.renter_id === userId,
        messages: messages.map(msg => ({
          ...msg,
          sender_name: msg.first_name ? `${msg.first_name} ${msg.last_name}` : 'System'
        }))
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Update booking status (owner only)
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['approved', 'cancelled', 'active', 'completed']),
  body('message').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, message } = req.body;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Get booking
    const bookings = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if user is owner or admin
    if (booking.owner_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['approved', 'cancelled'],
      'approved': ['active', 'cancelled'],
      'active': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ 
        error: `Cannot change status from ${booking.status} to ${status}` 
      });
    }

    // Update booking status
    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Add message if provided
    if (message) {
      await db.run(`
        INSERT INTO messages (booking_id, sender_id, recipient_id, channel, message_text)
        VALUES (?, ?, ?, ?, ?)
      `, [id, userId, booking.renter_id, 'inbox', message]);
    }

    // Send notification to renter
    const renter = await db.query('SELECT * FROM users WHERE id = ?', [booking.renter_id]);
    const item = await db.query('SELECT title FROM items WHERE id = ?', [booking.item_id]);
    
    if (renter.length > 0 && renter[0].phone && item.length > 0) {
      await sendBookingNotification(renter[0].phone, {
        itemTitle: item[0].title,
        startDate: booking.start_date,
        endDate: booking.end_date,
        status,
        totalAmount: booking.total_amount
      });
    }

    res.json({ 
      message: 'Booking status updated successfully',
      status 
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Cancel booking (renter only, if still pending)
router.put('/:id/cancel', authenticateToken, [
  body('reason').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = req.app.locals.db;
    const userId = req.user.id;

    // Get booking
    const bookings = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if user is renter
    if (booking.renter_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    // Check if booking can be cancelled
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending bookings' });
    }

    // Cancel booking
    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );

    // Add cancellation message
    const cancellationMessage = reason ? 
      `Booking cancelled by renter. Reason: ${reason}` :
      'Booking cancelled by renter.';

    await db.run(`
      INSERT INTO messages (booking_id, sender_id, recipient_id, channel, message_text)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userId, booking.owner_id, 'inbox', cancellationMessage]);

    res.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;