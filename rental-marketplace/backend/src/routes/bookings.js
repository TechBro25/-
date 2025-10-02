const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendBookingNotification } = require('../utils/whatsappStub');

const router = express.Router();

// Create booking
router.post('/', authenticate, async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.body;
    
    if (!itemId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Item ID, start date, and end date are required' });
    }
    
    // Get item details
    const item = await db.getAsync(
      'SELECT * FROM items WHERE id = ? AND status = ?',
      [itemId, 'available']
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found or not available' });
    }
    
    // Can't rent your own item
    if (item.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot rent your own item' });
    }
    
    // Calculate days and total
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (totalDays < 1) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    
    const totalPrice = item.price_per_day * totalDays;
    
    // Check for overlapping bookings
    const overlapping = await db.getAsync(
      `SELECT id FROM bookings 
       WHERE item_id = ? 
       AND status IN ('approved', 'active')
       AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`,
      [itemId, endDate, startDate, startDate, endDate]
    );
    
    if (overlapping) {
      return res.status(400).json({ error: 'Item is already booked for these dates' });
    }
    
    // Create booking
    const result = await db.runAsync(
      `INSERT INTO bookings (item_id, renter_id, owner_id, start_date, end_date, total_days, total_price, deposit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, req.user.id, item.owner_id, startDate, endDate, totalDays, totalPrice, item.deposit_amount]
    );
    
    // Send notification via WhatsApp (if user has phone)
    if (req.user.phone) {
      try {
        await sendBookingNotification(req.user.phone, {
          id: result.lastID,
          itemTitle: item.title,
          startDate,
          endDate,
          totalPrice
        });
      } catch (error) {
        console.error('Error sending booking notification:', error);
        // Don't fail the booking if notification fails
      }
    }
    
    // Create initial message to owner
    await db.runAsync(
      `INSERT INTO messages (booking_id, sender_id, receiver_id, channel, subject, body)
       VALUES (?, ?, ?, 'inbox', ?, ?)`,
      [
        result.lastID,
        req.user.id,
        item.owner_id,
        `New booking request for ${item.title}`,
        `Hi, I would like to rent your ${item.title} from ${startDate} to ${endDate}. Total amount: ₦${totalPrice.toLocaleString()}.`
      ]
    );
    
    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.lastID,
      totalPrice,
      depositAmount: item.deposit_amount
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Error creating booking' });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticate, async (req, res) => {
  try {
    const { type = 'renter' } = req.query; // 'renter' or 'owner'
    
    let query, params;
    
    if (type === 'owner') {
      query = `
        SELECT b.*, i.title as item_title, i.images as item_images,
               u.full_name as renter_name, u.phone as renter_phone
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON b.renter_id = u.id
        WHERE b.owner_id = ?
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT b.*, i.title as item_title, i.images as item_images,
               u.full_name as owner_name, u.phone as owner_phone
        FROM bookings b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON b.owner_id = u.id
        WHERE b.renter_id = ?
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    }
    
    const bookings = await db.allAsync(query, params);
    
    // Parse images
    const parsedBookings = bookings.map(booking => ({
      ...booking,
      item_images: booking.item_images ? JSON.parse(booking.item_images) : []
    }));
    
    res.json({ bookings: parsedBookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
});

// Get single booking
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await db.getAsync(
      `SELECT b.*, i.title as item_title, i.description as item_description, i.images as item_images,
              o.full_name as owner_name, o.phone as owner_phone, o.email as owner_email,
              r.full_name as renter_name, r.phone as renter_phone, r.email as renter_email
       FROM bookings b
       JOIN items i ON b.item_id = i.id
       JOIN users o ON b.owner_id = o.id
       JOIN users r ON b.renter_id = r.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization
    if (booking.renter_id !== req.user.id && booking.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }
    
    res.json({
      booking: {
        ...booking,
        item_images: booking.item_images ? JSON.parse(booking.item_images) : []
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Error fetching booking' });
  }
});

// Update booking status (owner or admin)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'active', 'completed', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const booking = await db.getAsync(
      'SELECT * FROM bookings WHERE id = ?',
      [req.params.id]
    );
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Only owner or admin can update status
    if (booking.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }
    
    await db.runAsync(
      `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, req.params.id]
    );
    
    // If approved, update item status
    if (status === 'approved' || status === 'active') {
      await db.runAsync(
        `UPDATE items SET status = 'rented' WHERE id = ?`,
        [booking.item_id]
      );
    } else if (status === 'completed' || status === 'cancelled') {
      await db.runAsync(
        `UPDATE items SET status = 'available' WHERE id = ?`,
        [booking.item_id]
      );
    }
    
    res.json({ message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Error updating booking status' });
  }
});

// Cancel booking (renter)
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await db.getAsync(
      'SELECT * FROM bookings WHERE id = ?',
      [req.params.id]
    );
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.renter_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending bookings' });
    }
    
    await db.runAsync(
      `UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Error cancelling booking' });
  }
});

module.exports = router;
