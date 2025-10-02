const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendKYCVerificationMessage } = require('../utils/whatsappStub');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../frontend/public/uploads/kyc/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Admin login (separate from regular auth for demo)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Simple admin check (in production, use proper authentication)
    if (email === (process.env.ADMIN_EMAIL || 'admin@example.com') && 
        password === (process.env.ADMIN_PASS || 'admin123secure')) {
      
      const db = req.app.locals.db;
      const admins = await db.query('SELECT * FROM users WHERE email = ? AND is_admin = 1', [email]);
      
      if (admins.length > 0) {
        const admin = admins[0];
        const jwt = require('jsonwebtoken');
        
        const token = jwt.sign(
          { userId: admin.id, email: admin.email, isAdmin: true },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        res.json({
          message: 'Admin login successful',
          token,
          user: {
            id: admin.id,
            email: admin.email,
            firstName: admin.first_name,
            lastName: admin.last_name,
            isAdmin: true
          }
        });
      } else {
        res.status(401).json({ error: 'Admin user not found in database' });
      }
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get various statistics
    const [
      userStats,
      itemStats,
      bookingStats,
      reviewStats,
      messageStats,
      kycStats
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as total, SUM(is_verified) as verified FROM users WHERE is_admin = 0'),
      db.query('SELECT COUNT(*) as total, SUM(is_available) as available FROM items'),
      db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(total_amount) as total_revenue
        FROM bookings
      `),
      db.query('SELECT COUNT(*) as total, SUM(is_flagged) as flagged FROM reviews'),
      db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN channel = 'inbox' THEN 1 ELSE 0 END) as inbox,
          SUM(CASE WHEN channel = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp
        FROM messages
      `),
      db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM kyc_documents
      `)
    ]);

    res.json({
      users: userStats[0],
      items: itemStats[0],
      bookings: bookingStats[0],
      reviews: reviewStats[0],
      messages: messageStats[0],
      kyc: kycStats[0]
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('verified').optional().isBoolean()
], async (req, res) => {
  try {
    const { page = 1, limit = 20, verified } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = ['is_admin = 0'];
    let queryParams = [];

    if (verified !== undefined) {
      whereConditions.push('is_verified = ?');
      queryParams.push(verified === 'true');
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const users = await db.query(`
      SELECT 
        users.*,
        COUNT(DISTINCT items.id) as items_count,
        COUNT(DISTINCT bookings.id) as bookings_count
      FROM users
      LEFT JOIN items ON users.id = items.owner_id
      LEFT JOIN bookings ON users.id = bookings.renter_id
      ${whereClause}
      GROUP BY users.id
      ORDER BY users.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM users ${whereClause}
    `, queryParams);

    res.json({
      users: users.map(user => ({
        ...user,
        password_hash: undefined // Don't send password hash
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all bookings
router.get('/bookings', authenticateToken, requireAdmin, [
  query('status').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('bookings.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const bookings = await db.query(`
      SELECT 
        bookings.*,
        items.title as item_title,
        items.category as item_category,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.email as owner_email,
        renter.first_name as renter_first_name,
        renter.last_name as renter_last_name,
        renter.email as renter_email
      FROM bookings
      JOIN items ON bookings.item_id = items.id
      JOIN users owner ON bookings.owner_id = owner.id
      JOIN users renter ON bookings.renter_id = renter.id
      ${whereClause}
      ORDER BY bookings.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bookings ${whereClause}
    `, queryParams);

    res.json({
      bookings: bookings.map(booking => ({
        ...booking,
        owner_name: `${booking.owner_first_name} ${booking.owner_last_name}`,
        renter_name: `${booking.renter_first_name} ${booking.renter_last_name}`
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// KYC verification endpoints
router.get('/kyc', authenticateToken, requireAdmin, [
  query('status').optional().isIn(['pending', 'verified', 'rejected']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('kyc_documents.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const kycDocs = await db.query(`
      SELECT 
        kyc_documents.*,
        users.first_name,
        users.last_name,
        users.email,
        users.phone
      FROM kyc_documents
      JOIN users ON kyc_documents.user_id = users.id
      ${whereClause}
      ORDER BY kyc_documents.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    res.json({ kycDocuments: kycDocs });

  } catch (error) {
    console.error('Get KYC documents error:', error);
    res.status(500).json({ error: 'Failed to fetch KYC documents' });
  }
});

// Submit KYC documents (user endpoint, but placed here for organization)
router.post('/kyc/submit', authenticateToken, upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;

    if (!req.files || !req.files.idDocument || !req.files.selfie) {
      return res.status(400).json({ error: 'Both ID document and selfie are required' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if user already has pending/verified KYC
    const existingKyc = await db.query(
      'SELECT id, status FROM kyc_documents WHERE user_id = ?',
      [userId]
    );

    if (existingKyc.length > 0 && existingKyc[0].status === 'verified') {
      return res.status(400).json({ error: 'KYC already verified' });
    }

    const idDocumentPath = `uploads/kyc/${req.files.idDocument[0].filename}`;
    const selfiePath = `uploads/kyc/${req.files.selfie[0].filename}`;

    if (existingKyc.length > 0) {
      // Update existing KYC
      await db.run(`
        UPDATE kyc_documents 
        SET id_document_path = ?, selfie_path = ?, verification_code = ?, status = 'pending', created_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [idDocumentPath, selfiePath, verificationCode, userId]);
    } else {
      // Create new KYC
      await db.run(`
        INSERT INTO kyc_documents (user_id, id_document_path, selfie_path, verification_code, status)
        VALUES (?, ?, ?, ?, 'pending')
      `, [userId, idDocumentPath, selfiePath, verificationCode]);
    }

    // Send verification code via WhatsApp (stub)
    if (req.user.phone) {
      await sendKYCVerificationMessage(
        req.user.phone, 
        verificationCode, 
        `${req.user.first_name} ${req.user.last_name}`
      );
    }

    res.json({
      message: 'KYC documents submitted successfully',
      verificationCode, // In production, don't return this
      instructions: `Please send the verification code ${verificationCode} to WhatsApp number ${process.env.WHATSAPP_NUMBER || '09154609327'} to complete verification.`
    });

  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ error: 'Failed to submit KYC documents' });
  }
});

// Approve/reject KYC
router.put('/kyc/:id', authenticateToken, requireAdmin, [
  body('status').isIn(['verified', 'rejected']),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const db = req.app.locals.db;

    // Get KYC document
    const kycDocs = await db.query(
      'SELECT * FROM kyc_documents WHERE id = ?',
      [id]
    );

    if (kycDocs.length === 0) {
      return res.status(404).json({ error: 'KYC document not found' });
    }

    const kycDoc = kycDocs[0];

    // Update KYC status
    await db.run(`
      UPDATE kyc_documents 
      SET status = ?, verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `, [status, status, id]);

    // Update user verification status
    if (status === 'verified') {
      await db.run(
        'UPDATE users SET is_verified = 1 WHERE id = ?',
        [kycDoc.user_id]
      );
    }

    // Send notification message
    const statusMessage = status === 'verified' ? 
      'Your account has been verified! You can now use all features.' :
      `Your verification was rejected. ${reason || 'Please resubmit with correct documents.'}`;

    await db.run(`
      INSERT INTO messages (sender_id, recipient_id, channel, message_text)
      VALUES (?, ?, 'inbox', ?)
    `, [req.user.id, kycDoc.user_id, statusMessage]);

    res.json({ message: `KYC ${status} successfully` });

  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

// Moderate reviews
router.get('/reviews', authenticateToken, requireAdmin, [
  query('flagged').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { flagged, page = 1, limit = 20 } = req.query;
    const db = req.app.locals.db;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (flagged !== undefined) {
      whereConditions.push('reviews.is_flagged = ?');
      queryParams.push(flagged === 'true');
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const reviews = await db.query(`
      SELECT 
        reviews.*,
        users.first_name as reviewer_first_name,
        users.last_name as reviewer_last_name,
        users.email as reviewer_email,
        items.title as item_title,
        items.category as item_category
      FROM reviews
      JOIN users ON reviews.reviewer_id = users.id
      JOIN items ON reviews.item_id = items.id
      ${whereClause}
      ORDER BY reviews.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    res.json({
      reviews: reviews.map(review => ({
        ...review,
        images: JSON.parse(review.images || '[]'),
        reviewer_name: `${review.reviewer_first_name} ${review.reviewer_last_name}`
      }))
    });

  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Update review status
router.put('/reviews/:id', authenticateToken, requireAdmin, [
  body('isFlagged').optional().isBoolean(),
  body('isVerified').optional().isBoolean()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { isFlagged, isVerified } = req.body;
    const db = req.app.locals.db;

    const updateFields = [];
    const updateValues = [];

    if (isFlagged !== undefined) {
      updateFields.push('is_flagged = ?');
      updateValues.push(isFlagged);
    }

    if (isVerified !== undefined) {
      updateFields.push('is_verified = ?');
      updateValues.push(isVerified);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id);

    await db.run(
      `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Review updated successfully' });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;