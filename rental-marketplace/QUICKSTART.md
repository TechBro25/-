# 🚀 Quick Start Guide

Get RentalHub running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd rental-marketplace/backend
npm install
```

## Step 2: Setup Database

```bash
npm run setup
```

This will:
- Create SQLite database
- Run migrations (create tables)
- Seed demo data (users, items, bookings, reviews)

## Step 3: Start Server

```bash
npm start
```

You should see:
```
🚀 RentalHub Server Started
================================
📍 Server running on: http://localhost:3000
🌐 Frontend: http://localhost:3000
⚡ API: http://localhost:3000/api
👨‍💼 Admin Panel: http://localhost:3000/admin
📱 WhatsApp Support: 091-546-09327
================================
```

## Step 4: Open Browser

Visit: **http://localhost:3000**

## Step 5: Test the Platform

### Browse Items
- Home page shows 10 demo rental items
- Click categories to filter
- Search for items

### Create Account
1. Click "Login" in navigation
2. Click "Don't have an account? Sign up"
3. Fill form and submit
4. You're now logged in!

### Make a Booking
1. Click any item card
2. Select start and end dates
3. See price calculation
4. Click "Request Booking"
5. Booking created!

### Admin Panel
1. Visit: http://localhost:3000/admin
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123456`
3. View dashboard stats
4. Approve bookings in "Bookings" tab

### Test WhatsApp Verification
1. Login as regular user
2. Open browser console
3. Run:
```javascript
requestVerification()
```
4. Check server terminal for 6-digit code
5. Simulate WhatsApp webhook:
```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{"from": "08012345678", "body": "123456"}'
```
(Replace 123456 with actual code from logs)

## Step 6: Run Tests

In a **new terminal** (keep server running):

```bash
cd rental-marketplace
node tests/booking.test.js
```

Should show:
```
🎉 ALL TESTS PASSED!
```

---

## 📱 Demo Users

All have password: `password123`

- aisha.bello@email.com
- emeka.okonkwo@email.com
- fatima.ahmed@email.com

---

## 🔗 Quick Links

- **API Docs**: See `README.md` API Documentation section
- **Admin Panel**: http://localhost:3000/admin
- **Database**: `backend/rental_marketplace.db` (SQLite file)

---

## ⚡ Common Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Reset database (careful - deletes all data!)
rm rental_marketplace.db
npm run setup

# Run tests
node ../tests/booking.test.js
```

---

## 🆘 Troubleshooting

**Port 3000 already in use?**
```bash
# Change PORT in .env file
PORT=4000
```

**Database errors?**
```bash
# Delete and recreate database
rm rental_marketplace.db
npm run setup
```

**Can't login?**
- Check console for errors
- Verify JWT_SECRET in .env exists
- Try creating new account

---

**That's it! You're ready to go! 🎉**

For detailed API documentation and production deployment, see `README.md`
