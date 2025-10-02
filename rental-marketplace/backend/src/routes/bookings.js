const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create new booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.body;
    
    // Validation
    if (!itemId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Item ID, start date, and end date are required' });
    }
    
    // Check if item exists and is available
    const item = await db.get('SELECT * FROM items WHERE id = ? AND is_available = 1', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found or not available' });
    }
    
    // Check if user is not the owner
    if (item.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot book your own item' });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }
    
    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // Check for conflicting bookings
    const conflictingBooking = await db.get(`
      SELECT id FROM bookings 
      WHERE item_id = ? AND status IN ('pending', 'approved') 
      AND (
        (start_date <= ? AND end_date > ?) OR 
        (start_date < ? AND end_date >= ?) OR 
        (start_date >= ? AND end_date <= ?)
      )
    `, [itemId, startDate, startDate, endDate, endDate, startDate, endDate]);
    
    if (conflictingBooking) {
      return res.status(400).json({ error: 'Item is not available for the selected dates' });
    }
    
    // Calculate total amount
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = daysDiff * item.price_per_day;
    
    // Create booking
    const result = await db.run(`
      INSERT INTO bookings (item_id, renter_id, start_date, end_date, total_amount, deposit_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [itemId, req.user.id, startDate, endDate, totalAmount, item.deposit_amount]);
    
    // Create notification message for admin
    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, booking_id, channel, subject, body)
      VALUES (?, NULL, ?, 'inbox', 'New Booking Request', ?)
    `, [
      req.user.id,
      result.id,
      `New booking request for "${item.title}" from ${req.user.first_name} ${req.user.last_name}. Dates: ${startDate} to ${endDate}. Total: ₦${totalAmount.toLocaleString()}.`
    ]);
    
    // Get the created booking with item details
    const booking = await db.get(`
      SELECT 
        b.*,
        i.title as item_title,
        i.images as item_images,
        u.first_name as renter_name,
        u.last_name as renter_last_name
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users u ON b.renter_id = u.id
      WHERE b.id = ?
    `, [result.id]);
    
    res.status(201).json({
      message: 'Booking request created successfully',
      booking: {
        ...booking,
        itemImages: booking.item_images ? JSON.parse(booking.item_images) : []
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's bookings
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const bookings = await db.all(`
      SELECT 
        b.*,
        i.title as item_title,
        i.images as item_images,
        i.location as item_location,
        owner.first_name as owner_name,
        owner.last_name as owner_last_name,
        owner.phone as owner_phone
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users owner ON i.owner_id = owner.id
      WHERE b.renter_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      itemImages: booking.item_images ? JSON.parse(booking.item_images) : []
    }));
    
    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings for user's items (as owner)
router.get('/my-items', authenticateToken, async (req, res) => {
  try {
    const bookings = await db.all(`
      SELECT 
        b.*,
        i.title as item_title,
        i.images as item_images,
        renter.first_name as renter_name,
        renter.last_name as renter_last_name,
        renter.phone as renter_phone,
        renter.email as renter_email
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users renter ON b.renter_id = renter.id
      WHERE i.owner_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      itemImages: booking.item_images ? JSON.parse(booking.item_images) : []
    }));
    
    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get my items bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status (owner or admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get booking with item details
    const booking = await db.get(`
      SELECT 
        b.*,
        i.title as item_title,
        i.owner_id,
        renter.first_name as renter_name,
        renter.last_name as renter_last_name
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users renter ON b.renter_id = renter.id
      WHERE b.id = ?
    `, [id]);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization
    if (booking.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }
    
    // Update booking status
    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    
    // Create notification message for renter
    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, booking_id, channel, subject, body)
      VALUES (?, ?, ?, 'inbox', 'Booking Status Update', ?)
    `, [
      req.user.id,
      booking.renter_id,
      id,
      `Your booking for "${booking.item_title}" has been ${status}.`
    ]);
    
    res.json({ message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel booking (renter only)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking
    const booking = await db.get(`
      SELECT 
        b.*,
        i.title as item_title,
        i.owner_id
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      WHERE b.id = ?
    `, [id]);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization
    if (booking.renter_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking cannot be cancelled' });
    }
    
    // Update booking status
    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );
    
    // Create notification message for owner
    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, booking_id, channel, subject, body)
      VALUES (?, ?, ?, 'inbox', 'Booking Cancelled', ?)
    `, [
      req.user.id,
      booking.owner_id,
      id,
      `Booking for "${booking.item_title}" has been cancelled by the renter.`
    ]);
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single booking details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await db.get(`
      SELECT 
        b.*,
        i.title as item_title,
        i.description as item_description,
        i.images as item_images,
        i.location as item_location,
        owner.first_name as owner_name,
        owner.last_name as owner_last_name,
        owner.phone as owner_phone,
        owner.email as owner_email,
        renter.first_name as renter_name,
        renter.last_name as renter_last_name,
        renter.phone as renter_phone,
        renter.email as renter_email
      FROM bookings b
      JOIN items i ON b.item_id = i.id
      JOIN users owner ON i.owner_id = owner.id
      JOIN users renter ON b.renter_id = renter.id
      WHERE b.id = ?
    `, [id]);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization
    if (booking.renter_id !== req.user.id && booking.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }
    
    const formattedBooking = {
      ...booking,
      itemImages: booking.item_images ? JSON.parse(booking.item_images) : []
    };
    
    res.json({ booking: formattedBooking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;