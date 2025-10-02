# Installation & Testing Guide

This guide walks through installing and testing the complete RentalHub platform.

## Prerequisites

- ✅ Node.js 16+ installed
- ✅ npm installed
- ✅ Terminal/command line access

## Step-by-Step Installation

### 1. Navigate to Backend Directory

```bash
cd rental-marketplace/backend
```

### 2. Install Dependencies

```bash
npm install
```

**Expected output:**
```
added XXX packages in XXs
```

**Packages installed:**
- express (web framework)
- sqlite3 (database)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- multer (file uploads)
- cors (cross-origin requests)
- dotenv (environment variables)
- express-rate-limit (rate limiting)

### 3. Verify .env File

Check that `.env` file exists:

```bash
ls -la .env
```

If not, copy from example:

```bash
cp .env.example .env
```

### 4. Setup Database

Run migrations and seeds:

```bash
npm run setup
```

**Expected output:**
```
✅ Migrations completed successfully
✅ Seeds completed successfully
```

**This creates:**
- `rental_marketplace.db` SQLite database file
- 9 tables (users, items, bookings, reviews, messages, etc.)
- 6 demo users
- 10 rental items
- 8 bookings
- 10 reviews
- 5 messages

### 5. Start Server

```bash
npm start
```

**Expected output:**
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

Server is now running! Keep this terminal open.

---

## Testing the Platform

Open a **new terminal window** for testing.

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2025-10-02T..."}
```

✅ **Success:** API is responding

---

### Test 2: Browse Items

```bash
curl http://localhost:3000/api/items?limit=3
```

**Expected:** JSON with 3 items including:
- White Wedding Tent
- Professional Sound System
- Canon EOS R5 Camera

✅ **Success:** Items endpoint working

---

### Test 3: Sign Up New User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "fullName": "Test User",
    "phone": "08099998888"
  }'
```

**Expected:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 7,
    "email": "test@example.com",
    "fullName": "Test User",
    ...
  }
}
```

**Save the token!** Copy it for next tests.

✅ **Success:** Signup working, JWT issued

---

### Test 4: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

**Expected:** Same response as signup with new token

✅ **Success:** Login working

---

### Test 5: Create Booking (Authenticated)

Replace `YOUR_TOKEN` with token from previous step:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemId": 1,
    "startDate": "2025-11-01",
    "endDate": "2025-11-03"
  }'
```

**Expected:**
```json
{
  "message": "Booking created successfully",
  "bookingId": 9,
  "totalPrice": 450000,
  "depositAmount": 50000
}
```

✅ **Success:** Booking creation working

---

### Test 6: View Reviews

```bash
curl http://localhost:3000/api/reviews/item/1
```

**Expected:** JSON with 4 reviews for Wedding Tent

✅ **Success:** Reviews endpoint working

---

### Test 7: Request Verification

```bash
curl -X POST http://localhost:3000/api/messages/verification/request \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
```json
{
  "message": "Verification code sent...",
  "whatsappNumber": "091-546-09327"
}
```

**Check server terminal** for verification code in logs (6 digits)

✅ **Success:** Verification request working

---

### Test 8: Simulate WhatsApp Verification

Replace `123456` with code from server logs:

```bash
curl -X POST http://localhost:3000/api/messages/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "08099998888",
    "body": "123456"
  }'
```

**Expected:**
```json
{
  "success": true,
  "verified": true,
  "userId": 7
}
```

✅ **Success:** WhatsApp verification working

---

### Test 9: Admin Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456"
  }'
```

**Save the admin token!**

✅ **Success:** Admin login working

---

### Test 10: Admin Dashboard Stats

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected:**
```json
{
  "stats": {
    "totalUsers": 7,
    "totalItems": 10,
    "totalBookings": 9,
    "totalRevenue": 900000,
    ...
  }
}
```

✅ **Success:** Admin endpoints working

---

## Browser Testing

### Test Frontend

1. **Open browser:** http://localhost:3000

   **You should see:**
   - RentalHub home page
   - Search bar
   - Category badges
   - 10 item cards

2. **Click any item**
   
   **You should see:**
   - Item detail page
   - Image gallery
   - Booking form
   - Reviews section

3. **Test Login**
   - Click "Login" in navigation
   - Enter: `emeka.okonkwo@email.com` / `password123`
   - Should redirect and show "Logout (Emeka Okonkwo)"

4. **Test Booking**
   - Go to any item
   - Select dates
   - See price calculation
   - Click "Request Booking"
   - Should show success message

5. **Test Admin Panel**
   - Visit: http://localhost:3000/admin
   - Login: `admin@example.com` / `admin123456`
   - Should see dashboard with stats
   - Click tabs (Bookings, Messages, KYC, Reviews)
   - All should load data

✅ **Success:** Frontend fully functional

---

## Integration Test

Run the automated integration test:

```bash
cd rental-marketplace
node tests/booking.test.js
```

**Expected output:**
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

5️⃣  Verifying booking...
   ✅ Booking verified
   ✅ Booking status is "pending" as expected

6️⃣  Sending inbox message...
   ✅ Message sent successfully

🎉 ALL TESTS PASSED!
```

✅ **Success:** All integration tests pass

---

## Verification Checklist

- [ ] Dependencies installed without errors
- [ ] Database created (rental_marketplace.db exists)
- [ ] Server starts on port 3000
- [ ] API health check responds
- [ ] Can browse items
- [ ] Can signup/login
- [ ] Can create bookings
- [ ] Reviews load correctly
- [ ] WhatsApp verification flow works
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] Frontend home page loads
- [ ] Item detail pages work
- [ ] Admin panel accessible
- [ ] Integration test passes

**All checked?** 🎉 Installation successful!

---

## Troubleshooting

### Port 3000 already in use

**Solution:** Change port in `.env`:
```
PORT=4000
```

### Database errors

**Solution:** Delete and recreate:
```bash
rm rental_marketplace.db
npm run setup
```

### "Module not found" errors

**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### JWT errors

**Solution:** Check `.env` has `JWT_SECRET` set

### Can't login with demo users

**Solution:** Passwords are case-sensitive. Use exactly:
- Admin: `admin123456`
- Users: `password123`

---

## Next Steps

Once installation is verified:

1. **Explore the API** - See README.md for all endpoints
2. **Customize** - Modify items, add categories
3. **Deploy** - Follow production deployment in README.md
4. **Integrate WhatsApp** - Replace stub with real API

---

## Support

If you encounter issues:

1. Check server terminal for error messages
2. Review README.md troubleshooting section
3. Verify all files present with `./verify-install.sh`
4. Ensure Node.js version is 16+

---

**Installation complete!** 🚀

The platform is now running and ready for development or deployment.
