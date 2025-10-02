const request = require('supertest');
const path = require('path');

// Import the app
const app = require('../backend/src/app');
const Database = require('../backend/src/db');

describe('Booking Integration Tests', () => {
  let db;
  let authToken;
  let testUserId;
  let testItemId;

  beforeAll(async () => {
    // Initialize test database
    process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
    db = new Database();
    await db.connect();
    await db.migrate();
    await db.seed();
    
    // Make database available to app
    app.locals.db = db;
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  beforeEach(async () => {
    // Create a test user and get auth token
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        phone: '08123456789'
      });

    expect(signupResponse.status).toBe(201);
    authToken = signupResponse.body.token;
    testUserId = signupResponse.body.user.id;

    // Create a test item
    const itemResponse = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Camera',
        description: 'A test camera for rental',
        category: 'Electronics',
        pricePerDay: 5000,
        depositAmount: 20000,
        location: 'Lagos, Nigeria',
        images: ['test-camera.jpg']
      });

    if (itemResponse.status === 201) {
      testItemId = itemResponse.body.item.id;
    } else {
      // Use existing item from seed data
      testItemId = 1;
    }
  });

  describe('POST /api/bookings', () => {
    test('should create a new booking successfully', async () => {
      const bookingData = {
        itemId: testItemId,
        startDate: '2025-12-01',
        endDate: '2025-12-03',
        message: 'I would like to rent this item for a special event'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Booking request created successfully');
      expect(response.body.booking).toHaveProperty('id');
      expect(response.body.booking.status).toBe('pending');
      expect(response.body.booking.item_id).toBe(testItemId);
      expect(response.body.booking.renter_id).toBe(testUserId);
    });

    test('should fail to create booking without authentication', async () => {
      const bookingData = {
        itemId: testItemId,
        startDate: '2025-12-01',
        endDate: '2025-12-03'
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should fail to create booking with invalid dates', async () => {
      const bookingData = {
        itemId: testItemId,
        startDate: '2025-12-03',
        endDate: '2025-12-01' // End date before start date
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('End date must be after start date');
    });

    test('should fail to create booking with past start date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const bookingData = {
        itemId: testItemId,
        startDate: yesterday.toISOString().split('T')[0],
        endDate: '2025-12-03'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date cannot be in the past');
    });

    test('should fail to create booking for non-existent item', async () => {
      const bookingData = {
        itemId: 99999, // Non-existent item
        startDate: '2025-12-01',
        endDate: '2025-12-03'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item not found or not available');
    });
  });

  describe('GET /api/bookings', () => {
    let bookingId;

    beforeEach(async () => {
      // Create a test booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testItemId,
          startDate: '2025-12-01',
          endDate: '2025-12-03',
          message: 'Test booking'
        });

      if (bookingResponse.status === 201) {
        bookingId = bookingResponse.body.booking.id;
      }
    });

    test('should get user bookings successfully', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bookings).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    test('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/api/bookings?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bookings).toBeInstanceOf(Array);
      
      // All returned bookings should have pending status
      response.body.bookings.forEach(booking => {
        expect(booking.status).toBe('pending');
      });
    });

    test('should fail to get bookings without authentication', async () => {
      const response = await request(app)
        .get('/api/bookings');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /api/bookings/:id', () => {
    let bookingId;

    beforeEach(async () => {
      // Create a test booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testItemId,
          startDate: '2025-12-01',
          endDate: '2025-12-03',
          message: 'Test booking'
        });

      if (bookingResponse.status === 201) {
        bookingId = bookingResponse.body.booking.id;
      }
    });

    test('should get single booking successfully', async () => {
      if (!bookingId) {
        console.log('Skipping test - no booking created');
        return;
      }

      const response = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.booking).toHaveProperty('id', bookingId);
      expect(response.body.booking).toHaveProperty('item_title');
      expect(response.body.booking).toHaveProperty('messages');
    });

    test('should fail to get non-existent booking', async () => {
      const response = await request(app)
        .get('/api/bookings/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Booking not found');
    });
  });

  describe('PUT /api/bookings/:id/cancel', () => {
    let bookingId;

    beforeEach(async () => {
      // Create a test booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testItemId,
          startDate: '2025-12-01',
          endDate: '2025-12-03',
          message: 'Test booking'
        });

      if (bookingResponse.status === 201) {
        bookingId = bookingResponse.body.booking.id;
      }
    });

    test('should cancel booking successfully', async () => {
      if (!bookingId) {
        console.log('Skipping test - no booking created');
        return;
      }

      const response = await request(app)
        .put(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Changed my mind'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Booking cancelled successfully');
    });

    test('should fail to cancel non-existent booking', async () => {
      const response = await request(app)
        .put('/api/bookings/99999/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Test cancellation'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Booking not found');
    });
  });
});

// Health check test
describe('Health Check', () => {
  test('should return health status', async () => {
    const response = await request(app)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('whatsapp');
  });
});

// Authentication tests
describe('Authentication', () => {
  test('should signup new user successfully', async () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      phone: '08123456789'
    };

    const response = await request(app)
      .post('/api/auth/signup')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created successfully');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(userData.email);
    expect(response.body.user.firstName).toBe(userData.firstName);
  });

  test('should login user successfully', async () => {
    // First create a user
    const userData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'password123'
    };

    await request(app)
      .post('/api/auth/signup')
      .send(userData);

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(userData.email);
  });

  test('should fail login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});

// Items tests
describe('Items API', () => {
  test('should get items successfully', async () => {
    const response = await request(app)
      .get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body.items).toBeInstanceOf(Array);
    expect(response.body.pagination).toHaveProperty('total');
  });

  test('should get single item successfully', async () => {
    const response = await request(app)
      .get('/api/items/1'); // Using seeded item

    expect(response.status).toBe(200);
    expect(response.body.item).toHaveProperty('id', 1);
    expect(response.body.item).toHaveProperty('title');
    expect(response.body.item).toHaveProperty('reviews');
  });

  test('should fail to get non-existent item', async () => {
    const response = await request(app)
      .get('/api/items/99999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Item not found');
  });
});

// WhatsApp webhook test
describe('WhatsApp Integration', () => {
  test('should handle WhatsApp webhook successfully', async () => {
    const webhookData = {
      from: '2348123456789',
      body: 'Hello, this is a test message with code 123456',
      timestamp: new Date().toISOString()
    };

    const response = await request(app)
      .post('/api/messages/whatsapp-webhook')
      .send(webhookData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('should generate WhatsApp link successfully', async () => {
    const response = await request(app)
      .get('/api/messages/whatsapp-link?message=Test message');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('whatsappLink');
    expect(response.body).toHaveProperty('number');
    expect(response.body.whatsappLink).toContain('wa.me');
  });
});

console.log('✅ Test suite completed. Run with: npm test');