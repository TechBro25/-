# Rental Marketplace with Inbox & WhatsApp Verification

A complete rental marketplace built with HTML/CSS/vanilla JS frontend and Node.js + Express backend, featuring integrated inbox messaging and WhatsApp verification system.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation & Setup

1. **Clone and navigate to the project:**
```bash
cd rental-marketplace/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

4. **Configure your .env file:**
```env
PORT=3000
NODE_ENV=development
DB_PATH=./database.sqlite
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
WHATSAPP_PHONE=09154609327
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
UPLOAD_PATH=../frontend/public/uploads
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Initialize database:**
```bash
npm run migrate
npm run seed
```

6. **Start the server:**
```bash
npm start
```

7. **Open your browser:**
- Main site: http://localhost:3000
- Admin panel: http://localhost:3000/admin.html

## 📱 WhatsApp Integration

### Current Implementation (Stub)
The current implementation includes a WhatsApp stub that simulates:
- Sending verification codes via WhatsApp
- Receiving WhatsApp messages through webhook
- KYC verification flow

### Testing WhatsApp Webhook
To test the KYC verification flow:

1. **Send a verification code via WhatsApp webhook:**
```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "08012345678",
    "body": "Your verification code is: 123456",
    "messageId": "test123"
  }'
```

2. **Check if KYC was verified:**
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/kyc?status=verified
```

### Production WhatsApp Integration
To integrate with real WhatsApp Business API:

1. **Choose a provider:**
   - [Twilio](https://www.twilio.com/whatsapp) - Easy integration, pay-per-message
   - [360dialog](https://www.360dialog.com/) - Official Meta partner
   - [MessageBird](https://www.messagebird.com/whatsapp) - Global reach

2. **Update `src/utils/whatsappStub.js`:**
   - Replace stub functions with real API calls
   - Add provider credentials to `.env`
   - Set up webhook endpoints

3. **Configure webhook:**
   - Endpoint: `/api/messages/whatsapp-webhook`
   - Events: `message.received`, `message.status`
   - Use webhook secret for security

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Items
- `GET /api/items` - List all items (with filters)
- `GET /api/items/:id` - Get item details
- `POST /api/items` - Create new item (authenticated)
- `PUT /api/items/:id` - Update item (owner only)
- `DELETE /api/items/:id` - Delete item (owner only)
- `GET /api/items/my/items` - Get user's items

### Bookings
- `POST /api/bookings` - Create booking request
- `GET /api/bookings/my` - Get user's bookings
- `GET /api/bookings/my-items` - Get bookings for user's items
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Reviews
- `GET /api/reviews/item/:itemId` - Get reviews for item
- `POST /api/reviews` - Submit review
- `GET /api/reviews/my` - Get user's reviews
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Messages
- `POST /api/messages/inbox` - Send inbox message
- `GET /api/messages/my` - Get user's messages
- `GET /api/messages/unread-count` - Get unread count
- `POST /api/messages/whatsapp-webhook` - WhatsApp webhook

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `GET /api/admin/items` - List items
- `GET /api/admin/bookings` - List bookings
- `GET /api/admin/reviews` - List reviews
- `GET /api/admin/messages` - List messages
- `GET /api/admin/kyc` - List KYC documents
- `PUT /api/admin/bookings/:id/status` - Update booking status
- `PUT /api/admin/reviews/:id/moderate` - Moderate review
- `PUT /api/admin/kyc/:id/approve` - Approve KYC
- `PUT /api/admin/kyc/:id/reject` - Reject KYC
- `POST /api/admin/kyc/:id/send-code` - Send verification code

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing with cURL

1. **Sign up a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "08012345678"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

3. **Create a booking (replace TOKEN with actual token):**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "itemId": 1,
    "startDate": "2025-06-01",
    "endDate": "2025-06-03"
  }'
```

4. **Send inbox message:**
```bash
curl -X POST http://localhost:3000/api/messages/inbox \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "subject": "Test Message",
    "body": "This is a test message from the API"
  }'
```

5. **Simulate WhatsApp verification:**
```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "08012345678",
    "body": "My verification code is 123456",
    "messageId": "test123"
  }'
```

6. **Submit a review:**
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "itemId": 1,
    "bookingId": 1,
    "rating": 5,
    "title": "Great item!",
    "comment": "Really enjoyed renting this item. Highly recommended!"
  }'
```

## 👥 Demo Users

The system comes with pre-seeded demo data:

### Admin User
- **Email:** admin@example.com
- **Password:** admin123
- **Access:** Full admin panel access

### Regular Users
- **Email:** john.doe@example.com
- **Password:** password123
- **Email:** jane.smith@example.com
- **Password:** password123

## 📊 Sample Data

The system includes:
- **6-10 rental items** across different categories
- **10 sample reviews** with realistic content
- **Demo bookings** in various statuses
- **Sample messages** (inbox and WhatsApp)
- **KYC documents** for testing verification

## 🔐 Security Features

- **Password hashing** with bcrypt (12 rounds)
- **JWT authentication** with 7-day expiration
- **Rate limiting** on authentication endpoints
- **Input validation** on all endpoints
- **SQL injection protection** with parameterized queries
- **CORS protection** with proper headers
- **Helmet.js** for security headers

## 🌍 Localization

- **Currency:** Nigerian Naira (₦)
- **Timezone:** Africa/Lagos
- **Phone format:** Nigerian format
- **WhatsApp number:** 091-546-09327

## 📁 Project Structure

```
rental-marketplace/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── db.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── items.js
│   │   │   ├── bookings.js
│   │   │   ├── reviews.js
│   │   │   ├── messages.js
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── utils/
│   │       └── whatsappStub.js
│   ├── migrations/
│   │   └── init.sql
│   └── seeds/
│       └── seed.sql
├── frontend/
│   ├── public/
│   │   └── uploads/placeholder/
│   ├── styles/
│   │   └── main.css
│   ├── index.html
│   ├── item.html
│   ├── admin.html
│   └── scripts/
│       ├── main.js
│       └── admin.js
├── README.md
└── tests/
    └── booking.test.js
```

## 🚀 Deployment

### Production Checklist
1. **Environment Variables:**
   - Set strong JWT_SECRET
   - Configure production database
   - Set up real WhatsApp Business API credentials
   - Configure proper CORS origins

2. **Database:**
   - Use PostgreSQL or MySQL for production
   - Set up proper backups
   - Configure connection pooling

3. **Security:**
   - Enable HTTPS
   - Set up proper firewall rules
   - Configure rate limiting
   - Set up monitoring and logging

4. **WhatsApp Integration:**
   - Register WhatsApp Business API
   - Set up webhook endpoints
   - Test message delivery
   - Configure message templates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, contact:
- **WhatsApp:** 091-546-09327
- **Email:** support@rentalmarket.ng
- **Inbox:** Use the contact form on the website

---

**Built with ❤️ for the Nigerian rental market**