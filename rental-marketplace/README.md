# Rental Marketplace

A complete rental marketplace with integrated inbox and WhatsApp verification system. Built with Node.js/Express backend and vanilla JavaScript frontend.

## Features

- **User Authentication**: Secure signup/login with JWT tokens
- **Item Listings**: Browse and search rental items by category, location, price
- **Booking System**: Request rentals with date selection and pricing calculation
- **Reviews & Ratings**: User reviews with photo/video support and moderation
- **Integrated Messaging**: On-site inbox system for user communication
- **WhatsApp Integration**: Support contact via WhatsApp (091-546-09327)
- **KYC Verification**: ID upload with WhatsApp code verification flow
- **Admin Panel**: Complete admin dashboard for managing users, bookings, KYC, reviews
- **Payment Simulation**: Simplified payment flow with bank transfer option
- **Responsive Design**: Mobile-friendly interface

## Project Structure

```
rental-marketplace/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js              # Server entry point
│   │   ├── app.js                 # Express app configuration
│   │   ├── db.js                  # Database connection and utilities
│   │   ├── routes/
│   │   │   ├── auth.js            # Authentication endpoints
│   │   │   ├── items.js           # Item management endpoints
│   │   │   ├── bookings.js        # Booking management endpoints
│   │   │   ├── reviews.js         # Review management endpoints
│   │   │   ├── messages.js        # Messaging endpoints
│   │   │   └── admin.js           # Admin panel endpoints
│   │   ├── middleware/
│   │   │   └── auth.js            # Authentication middleware
│   │   └── utils/
│   │       └── whatsappStub.js    # WhatsApp integration stub
│   ├── migrations/
│   │   └── init.sql               # Database schema
│   └── seeds/
│       └── seed.sql               # Sample data
├── frontend/
│   ├── public/
│   │   └── uploads/placeholder/   # Placeholder images
│   ├── styles/
│   │   └── main.css              # Main stylesheet
│   ├── index.html                # Home page
│   ├── item.html                 # Item details page
│   ├── admin.html                # Admin panel
│   └── scripts/
│       └── main.js               # Frontend JavaScript
├── tests/
│   └── booking.test.js           # Integration tests
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd rental-marketplace/backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./database.sqlite
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=admin123secure
WHATSAPP_NUMBER=09154609327
```

### 3. Database Setup

```bash
# Run migrations
npm run migrate

# Seed with sample data
npm run seed
```

### 4. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html
- **API Health**: http://localhost:3000/api/health

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Items
- `GET /api/items` - List items (with filters)
- `GET /api/items/:id` - Get item details
- `POST /api/items` - Create item (authenticated)
- `PUT /api/items/:id` - Update item (owner only)
- `DELETE /api/items/:id` - Delete item (owner only)

### Bookings
- `GET /api/bookings` - List user bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking request
- `PUT /api/bookings/:id/status` - Update booking status (owner)
- `PUT /api/bookings/:id/cancel` - Cancel booking (renter)

### Reviews
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Messages
- `GET /api/messages` - List user messages
- `POST /api/messages` - Send message
- `POST /api/messages/whatsapp-webhook` - WhatsApp webhook
- `GET /api/messages/whatsapp-link` - Generate WhatsApp link

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/bookings` - List all bookings
- `GET /api/admin/kyc` - List KYC documents
- `POST /api/admin/kyc/submit` - Submit KYC documents
- `PUT /api/admin/kyc/:id` - Approve/reject KYC

## Testing

### Run Tests
```bash
cd backend
npm test
```

### Manual Testing with cURL

#### 1. User Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "password": "password123",
    "phone": "08123456789"
  }'
```

#### 2. User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Create Booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "itemId": 1,
    "startDate": "2025-12-01",
    "endDate": "2025-12-03",
    "message": "I would like to rent this item"
  }'
```

#### 4. Send Inbox Message
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "Need Help",
    "message": "I have a question about my booking"
  }'
```

#### 5. Simulate WhatsApp Webhook (KYC Verification)
```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "2348123456789",
    "body": "My verification code is 123456",
    "timestamp": "2025-01-01T12:00:00Z"
  }'
```

#### 6. Submit Review
```bash
curl -X POST "http://localhost:3000/api/reviews?demo=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "bookingId": 1,
    "rating": 5,
    "comment": "Excellent item and service!"
  }'
```

## Default Users

The seed data creates these users:

### Admin User
- **Email**: admin@example.com
- **Password**: admin123secure (from .env)

### Demo Users (Password: password123)
- aisha.bello@email.com - Verified user with items
- emeka.okonkwo@email.com - Verified user with items  
- fatima.ibrahim@email.com - Verified user with items
- kemi.adebayo@email.com - Verified user with items

## WhatsApp Integration

The system includes WhatsApp integration stubs for:

### Support Contact
- Users can contact support via WhatsApp: **091-546-09327**
- Automatic message templates for different scenarios

### KYC Verification Flow
1. User uploads ID document and selfie
2. System generates 6-digit verification code
3. User sends code to WhatsApp number 091-546-09327
4. Webhook endpoint processes the message and verifies account

### Testing WhatsApp Webhook
```bash
# Simulate receiving WhatsApp message with verification code
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "2348123456789",
    "body": "123456",
    "timestamp": "2025-01-01T12:00:00Z"
  }'
```

## Production Deployment

### Environment Variables
Set these in production:
```env
NODE_ENV=production
JWT_SECRET=your-strong-production-secret
DB_PATH=/path/to/production/database.sqlite
ADMIN_PASS=secure-admin-password
```

### WhatsApp Business API Integration
Replace the stub functions in `utils/whatsappStub.js` with actual WhatsApp Business API calls using:
- **Twilio WhatsApp API**
- **360dialog**
- **WhatsApp Cloud API**
- **Other WhatsApp Business providers**

### File Upload Configuration
- Configure proper file storage (AWS S3, Cloudinary, etc.)
- Update `multer` configuration in admin routes
- Set appropriate file size limits and validation

### Security Considerations
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Use environment-specific CORS settings
- Implement proper error handling
- Add logging and monitoring

## Currency and Timezone

- **Default Currency**: Nigerian Naira (₦)
- **Default Timezone**: Africa/Lagos
- All prices displayed in Naira format
- Dates formatted for Nigerian timezone

## Sample Data

The system comes with pre-seeded data including:
- 8 rental items across different categories
- 10 sample reviews with realistic content
- Demo bookings in various statuses
- Sample messages and KYC documents

## Support

For support, contact via:
- **Website Inbox**: Use the contact form on the site
- **WhatsApp**: 091-546-09327
- **Admin Panel**: http://localhost:3000/admin.html

## License

MIT License - see LICENSE file for details.

---

**Note**: This is a demo application. In production, ensure proper security measures, real payment integration, and actual WhatsApp Business API implementation.