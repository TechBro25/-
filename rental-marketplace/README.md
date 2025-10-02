# RentalHub - Rental Marketplace Platform

A complete rental marketplace with integrated inbox messaging and WhatsApp verification built with Node.js, Express, SQLite, and vanilla JavaScript.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [WhatsApp Integration](#whatsapp-integration)
- [Admin Panel](#admin-panel)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)

---

## ✨ Features

### Core Features
- **Browse & Search**: Search and filter rental items by category, location, and price
- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Booking System**: Complete rental booking workflow with status tracking
- **Reviews & Ratings**: Users can review items with photos/videos
- **Messaging System**: Dual-channel communication (inbox + WhatsApp)
- **KYC Verification**: WhatsApp-based phone verification with 6-digit codes
- **Admin Dashboard**: Comprehensive admin panel for managing platform

### Security Features
- Password hashing with bcrypt
- JWT authentication with expiry
- Rate limiting on auth endpoints
- Input validation
- SQL injection protection (parameterized queries)

### Communication Channels
- **Inbox**: In-platform threaded messaging tied to bookings
- **WhatsApp**: Official support via **091-546-09327** (stubbed for development)

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- SQLite3 (easy local development, can swap to PostgreSQL/MySQL)
- JWT for authentication
- Bcrypt for password hashing
- Multer for file uploads

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Responsive modern UI
- No framework dependencies

---

## 📁 Project Structure

```
rental-marketplace/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js              # Entry point
│   │   ├── app.js                 # Express app setup
│   │   ├── db.js                  # Database connection & CLI
│   │   ├── routes/
│   │   │   ├── auth.js            # Auth endpoints
│   │   │   ├── items.js           # Items CRUD
│   │   │   ├── bookings.js        # Booking management
│   │   │   ├── reviews.js         # Reviews & ratings
│   │   │   ├── messages.js        # Inbox & WhatsApp
│   │   │   └── admin.js           # Admin endpoints
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT verification
│   │   └── utils/
│   │       └── whatsappStub.js    # WhatsApp stub/mock
│   ├── migrations/
│   │   └── init.sql               # Database schema
│   └── seeds/
│       └── seed.sql               # Demo data
├── frontend/
│   ├── public/
│   │   └── uploads/               # Uploaded files
│   │       └── placeholder/       # Seed images
│   ├── styles/
│   │   └── main.css              # All styles
│   ├── scripts/
│   │   └── main.js               # Frontend logic
│   ├── index.html                # Home page
│   ├── item.html                 # Item detail
│   └── admin.html                # Admin panel
├── tests/
│   └── booking.test.js           # Integration test
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

1. **Clone/Download the project**
```bash
cd rental-marketplace
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development).

4. **Setup database** (run migrations and seeds)
```bash
npm run setup
```

This creates the SQLite database, tables, and inserts demo data.

5. **Start the server**
```bash
npm start
```

Server runs on `http://localhost:3000`

6. **Access the application**
- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API**: http://localhost:3000/api

---

## 🔐 Demo Credentials

### Admin
- Email: `admin@example.com`
- Password: `admin123456`

### Regular Users
All demo users have password: `password123`
- `aisha.bello@email.com`
- `emeka.okonkwo@email.com`
- `fatima.ahmed@email.com`
- `chioma.nwankwo@email.com`

---

## 📡 API Documentation

Base URL: `http://localhost:3000/api`

### Authentication

#### POST `/auth/signup`
Create a new user account.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "fullName": "New User",
    "phone": "08012345678"
  }'
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 7,
    "email": "newuser@example.com",
    "fullName": "New User",
    "phone": "08012345678",
    "role": "user",
    "isVerified": false
  }
}
```

#### POST `/auth/login`
Login with existing credentials.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123"
  }'
```

**Response:** Same as signup

---

### Items

#### GET `/items`
List all available items with optional filters.

**Query Parameters:**
- `category` - Filter by category
- `search` - Search in title/description
- `minPrice` - Minimum price per day
- `maxPrice` - Maximum price per day
- `location` - Filter by location
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Request:**
```bash
curl http://localhost:3000/api/items?category=Event%20Equipment&limit=5
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "owner_id": 6,
      "title": "White Wedding Tent (500 capacity)",
      "description": "Beautiful white wedding tent...",
      "category": "Event Equipment",
      "price_per_day": 150000,
      "deposit_amount": 50000,
      "location": "Lagos, Nigeria",
      "status": "available",
      "images": ["placeholder/wedding_tent_01.jpg", "..."],
      "rating": 5,
      "review_count": 4
    }
  ]
}
```

#### GET `/items/:id`
Get single item details.

**Request:**
```bash
curl http://localhost:3000/api/items/1
```

#### POST `/items`
Create new item (requires authentication).

**Request:**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Professional Camera",
    "description": "High-quality camera for events",
    "category": "Photography",
    "pricePerDay": 25000,
    "depositAmount": 50000,
    "location": "Lagos, Nigeria"
  }'
```

---

### Bookings

#### POST `/bookings`
Create a new booking request.

**Request:**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 1,
    "startDate": "2025-11-01",
    "endDate": "2025-11-03"
  }'
```

**Response:**
```json
{
  "message": "Booking created successfully",
  "bookingId": 9,
  "totalPrice": 450000,
  "depositAmount": 50000
}
```

#### GET `/bookings/my-bookings?type=renter`
Get user's bookings (as renter or owner).

**Query Parameters:**
- `type` - `renter` or `owner` (default: renter)

**Request:**
```bash
curl http://localhost:3000/api/bookings/my-bookings?type=renter \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH `/bookings/:id/status`
Update booking status (owner/admin only).

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/bookings/7/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

---

### Reviews

#### GET `/reviews/item/:itemId`
Get all reviews for an item.

**Request:**
```bash
curl http://localhost:3000/api/reviews/item/1
```

#### POST `/reviews`
Submit a review (requires completed booking or `?canReview=true` for demo).

**Request:**
```bash
curl -X POST http://localhost:3000/api/reviews?canReview=true \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": 1,
    "rating": 5,
    "comment": "Excellent service!"
  }'
```

For uploading media with review, use `multipart/form-data`:
```bash
curl -X POST http://localhost:3000/api/reviews?canReview=true \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "itemId=1" \
  -F "rating=5" \
  -F "comment=Great item!" \
  -F "media=@photo1.jpg" \
  -F "media=@photo2.jpg"
```

---

### Messages

#### POST `/messages`
Send an inbox message.

**Request:**
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 7,
    "subject": "Question about booking",
    "body": "When can I pick up the item?"
  }'
```

#### GET `/messages`
Get user's messages (optionally filtered by booking).

**Query Parameters:**
- `bookingId` - Filter by specific booking

**Request:**
```bash
curl http://localhost:3000/api/messages?bookingId=7 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### WhatsApp Integration

#### POST `/messages/verification/request`
Request KYC verification code via WhatsApp.

**Request:**
```bash
curl -X POST http://localhost:3000/api/messages/verification/request \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "message": "Verification code sent. Please check WhatsApp and send the code to our number to verify.",
  "whatsappNumber": "091-546-09327"
}
```

#### POST `/messages/whatsapp-webhook`
Receive incoming WhatsApp messages (webhook endpoint).

**Testing Verification Flow:**

1. Request verification code (see above)
2. The system generates a 6-digit code (check console logs for the code in dev)
3. Simulate receiving WhatsApp message with the code:

```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "08012345678",
    "body": "My verification code is 123456"
  }'
```

4. The system will automatically verify the user and update their status.

#### GET `/messages/verification/status`
Check user's verification status.

**Request:**
```bash
curl http://localhost:3000/api/messages/verification/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Admin Endpoints

All admin endpoints require admin role authentication.

#### GET `/admin/stats`
Get dashboard statistics.

**Request:**
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### GET `/admin/bookings`
List all bookings.

#### GET `/admin/messages?channel=whatsapp`
List all messages (optionally filter by channel).

#### GET `/admin/kyc?status=code_sent`
Get KYC verification queue.

#### PATCH `/admin/kyc/:id/status`
Approve/reject KYC manually.

```bash
curl -X PATCH http://localhost:3000/api/admin/kyc/1/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
```

#### GET `/admin/reviews`
List all reviews.

#### PATCH `/admin/reviews/:id/flag`
Flag/unflag a review.

```bash
curl -X PATCH http://localhost:3000/api/admin/reviews/1/flag \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flagged": true}'
```

---

## 🧪 Testing

### Run Integration Test

```bash
# Make sure server is running first in another terminal:
npm start

# In a new terminal, run the test:
node tests/booking.test.js
```

**Test Flow:**
1. Creates a new user account
2. Logs in to get auth token
3. Fetches available items
4. Creates a booking
5. Verifies booking status is "pending"
6. Sends an inbox message

**Expected Output:**
```
🧪 Starting Booking Integration Test

1️⃣  Creating test user...
   ✅ User created successfully
   
2️⃣  Testing login...
   ✅ Login successful
   
3️⃣  Fetching available items...
   ✅ Found 10 items
   
4️⃣  Creating booking...
   ✅ Booking created successfully
   🆔 Booking ID: 9
   💰 Total: ₦450,000
   
5️⃣  Verifying booking...
   ✅ Booking verified
   📊 Status: pending
   
6️⃣  Sending inbox message...
   ✅ Message sent successfully

🎉 ALL TESTS PASSED!
```

---

## 📱 WhatsApp Integration

### Current Implementation (Development)

The app includes a **stub/mock** WhatsApp integration for development and testing. All WhatsApp functionality is simulated.

**WhatsApp Number:** `091-546-09327` (all communications reference this number)

### Features Implemented:
- ✅ Verification code generation (6-digit)
- ✅ Code storage in database
- ✅ Webhook endpoint to receive messages
- ✅ Automatic verification when code is received
- ✅ Support contact links (opens WhatsApp web)

### Testing Verification Flow:

**Step 1: Request verification**
```bash
curl -X POST http://localhost:3000/api/messages/verification/request \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Step 2: Check server logs for the code**
The console will show:
```
📱 [WhatsApp Stub] Sending message:
   To: 08012345678
   Message: Your RentalHub verification code is: 456789
```

**Step 3: Simulate receiving WhatsApp message**
```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "08012345678",
    "body": "456789"
  }'
```

**Step 4: Verify user is now verified**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response will show `"isVerified": true`

### Production Integration

To connect to real WhatsApp Business API in production:

**Option 1: Twilio**
```javascript
// In utils/whatsappStub.js, replace sendWhatsAppMessage with:
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

async function sendWhatsAppMessage(to, message) {
  return await client.messages.create({
    from: 'whatsapp:+2349154609327',
    to: `whatsapp:${to}`,
    body: message
  });
}
```

**Option 2: 360dialog / WhatsApp Business API**
```javascript
async function sendWhatsAppMessage(to, message) {
  const response = await fetch('https://waba.360dialog.io/v1/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': process.env.WHATSAPP_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: to,
      type: 'text',
      text: { body: message }
    })
  });
  return await response.json();
}
```

**Webhook Setup:**
Point your WhatsApp Business webhook to:
`https://yourdomain.com/api/messages/whatsapp-webhook`

---

## 👨‍💼 Admin Panel

Access at: `http://localhost:3000/admin`

**Login:** `admin@example.com` / `admin123456`

### Features:
- **Dashboard**: Stats overview (users, items, bookings, revenue)
- **Bookings**: View and approve/reject booking requests
- **Messages**: Monitor all inbox and WhatsApp messages
- **KYC Queue**: Approve/reject user verifications
- **Reviews**: Moderate and flag inappropriate reviews
- **Users**: View all registered users

---

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./rental_marketplace.db

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123456

# WhatsApp Configuration
WHATSAPP_NUMBER=09154609327
WHATSAPP_NUMBER_FORMATTED=+2349154609327

# File Upload
UPLOAD_DIR=../frontend/public/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Production Deployment

### Preparation

1. **Change JWT Secret**
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

2. **Update Admin Password**
Generate a bcrypt hash:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your-strong-password', 10);
// Update in seeds/seed.sql
```

3. **Set Environment**
```bash
NODE_ENV=production
```

4. **Use Production Database**
For production, consider switching to PostgreSQL or MySQL:
- Update `src/db.js` to use `pg` or `mysql2`
- Update connection string in `.env`

### Deploy Options

**Option 1: VPS (DigitalOcean, Linode, etc.)**
```bash
# Install Node.js on server
# Clone repo
cd rental-marketplace/backend
npm install --production
npm run setup
pm2 start src/server.js --name rentalhub
```

**Option 2: Platform as a Service (Heroku, Railway, Render)**
- Push code to Git
- Connect repo to platform
- Set environment variables
- Platform auto-deploys

**Option 3: Serverless (Vercel, Netlify Functions)**
- Requires adapting Express app to serverless functions
- Frontend can be static, backend as API routes

### Nginx Configuration (for VPS)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Database Schema

### Key Tables:
- `users` - User accounts (email, password_hash, role, is_verified)
- `items` - Rental items (title, price_per_day, deposit_amount, images, rating)
- `bookings` - Rental bookings (item_id, renter_id, dates, status, payment_status)
- `reviews` - Item reviews (rating, comment, media)
- `messages` - Communication (channel: inbox/whatsapp, booking_id)
- `kyc_documents` - Verification records (verification_code, status)
- `payments` - Payment transactions (amount, payment_method, status)
- `disputes` - Dispute management

See `backend/migrations/init.sql` for full schema.

---

## 🛠️ Development Scripts

```bash
# Install dependencies
npm install

# Run migrations only
npm run migrate

# Run seeds only
npm run seed

# Setup (migrate + seed)
npm run setup

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Run tests
npm test
```

---

## 🐛 Troubleshooting

### "Database locked" error
SQLite doesn't handle high concurrency well. For production, switch to PostgreSQL.

### Images not loading
- Check that placeholder images exist in `frontend/public/uploads/placeholder/`
- Verify uploads directory has write permissions

### JWT "Invalid token" error
- Token may be expired (7-day expiry by default)
- Check JWT_SECRET matches between sessions

### Rate limit errors on signup
Rate limiter allows 5 attempts per 15 minutes. Wait or restart server to reset.

---

## 📝 License

MIT License - feel free to use for personal or commercial projects.

---

## 📞 Support

For support, contact via:
- **Inbox**: Use the contact support button on the site
- **WhatsApp**: 091-546-09327

---

## 🎯 Next Steps / Roadmap

- [ ] Real-time notifications (Socket.io)
- [ ] Payment gateway integration (Paystack/Stripe)
- [ ] Email notifications (SendGrid/Mailgun)
- [ ] Advanced search with Elasticsearch
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Automated dispute resolution
- [ ] Insurance integration
- [ ] Background verification checks

---

**Built with ❤️ for the Nigerian rental market**

Default Currency: **Naira (₦)**  
Default Timezone: **Africa/Lagos (WAT)**
