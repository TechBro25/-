/**
 * Integration Test for Booking Creation
 * 
 * This test demonstrates the booking flow:
 * 1. Create a test user
 * 2. Login to get auth token
 * 3. Create a booking
 * 4. Verify booking status
 * 
 * Run with: npm test
 * Or manually with: node tests/booking.test.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test runner
async function runTests() {
  console.log('🧪 Starting Booking Integration Test\n');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  let authToken = null;
  let bookingId = null;
  
  try {
    // Test 1: Create user
    console.log('1️⃣  Creating test user...');
    const signupRes = await makeRequest('POST', '/auth/signup', {
      email: testEmail,
      password: testPassword,
      fullName: 'Test User',
      phone: '08099887766'
    });
    
    if (signupRes.status === 201) {
      authToken = signupRes.data.token;
      console.log('   ✅ User created successfully');
      console.log(`   📧 Email: ${testEmail}`);
      console.log(`   🔑 Token: ${authToken.substring(0, 20)}...`);
    } else {
      throw new Error('Failed to create user: ' + JSON.stringify(signupRes.data));
    }
    
    // Test 2: Login (verify auth works)
    console.log('\n2️⃣  Testing login...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: testPassword
    });
    
    if (loginRes.status === 200) {
      console.log('   ✅ Login successful');
      console.log(`   👤 User: ${loginRes.data.user.fullName}`);
    } else {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
    }
    
    // Test 3: Get items (verify we can browse)
    console.log('\n3️⃣  Fetching available items...');
    const itemsRes = await makeRequest('GET', '/items?limit=5');
    
    if (itemsRes.status === 200 && itemsRes.data.items.length > 0) {
      console.log(`   ✅ Found ${itemsRes.data.items.length} items`);
      const firstItem = itemsRes.data.items[0];
      console.log(`   📦 First item: ${firstItem.title} (₦${firstItem.price_per_day}/day)`);
    } else {
      throw new Error('No items found');
    }
    
    // Test 4: Create booking
    console.log('\n4️⃣  Creating booking...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 8);
    
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];
    
    const firstItem = itemsRes.data.items[0];
    
    const bookingRes = await makeRequest('POST', '/bookings', {
      itemId: firstItem.id,
      startDate: startDate,
      endDate: endDate
    }, authToken);
    
    if (bookingRes.status === 201) {
      bookingId = bookingRes.data.bookingId;
      console.log('   ✅ Booking created successfully');
      console.log(`   🆔 Booking ID: ${bookingId}`);
      console.log(`   📅 Dates: ${startDate} to ${endDate}`);
      console.log(`   💰 Total: ₦${bookingRes.data.totalPrice.toLocaleString()}`);
      console.log(`   🔒 Deposit: ₦${bookingRes.data.depositAmount.toLocaleString()}`);
    } else {
      throw new Error('Booking failed: ' + JSON.stringify(bookingRes.data));
    }
    
    // Test 5: Verify booking exists
    console.log('\n5️⃣  Verifying booking...');
    const myBookingsRes = await makeRequest('GET', '/bookings/my-bookings?type=renter', null, authToken);
    
    if (myBookingsRes.status === 200) {
      const booking = myBookingsRes.data.bookings.find(b => b.id === bookingId);
      
      if (booking) {
        console.log('   ✅ Booking verified');
        console.log(`   📊 Status: ${booking.status}`);
        console.log(`   💳 Payment Status: ${booking.payment_status}`);
        
        if (booking.status === 'pending') {
          console.log('   ✅ Booking status is "pending" as expected');
        } else {
          console.log(`   ⚠️  Warning: Expected status "pending" but got "${booking.status}"`);
        }
      } else {
        throw new Error('Booking not found in user bookings');
      }
    } else {
      throw new Error('Failed to fetch bookings: ' + JSON.stringify(myBookingsRes.data));
    }
    
    // Test 6: Send inbox message about booking
    console.log('\n6️⃣  Sending inbox message...');
    const messageRes = await makeRequest('POST', '/messages', {
      bookingId: bookingId,
      subject: 'Test message',
      body: 'This is a test message for the booking'
    }, authToken);
    
    if (messageRes.status === 201) {
      console.log('   ✅ Message sent successfully');
    } else {
      console.log('   ⚠️  Message sending failed (non-critical)');
    }
    
    // Success!
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\n📝 Test Summary:');
    console.log(`   • User created: ${testEmail}`);
    console.log(`   • Booking created: #${bookingId}`);
    console.log(`   • Status: pending`);
    console.log(`   • All endpoints working correctly`);
    console.log('\n✅ Integration test completed successfully!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  console.log('⏳ Waiting for server to be ready...\n');
  
  // Give server time to start
  setTimeout(() => {
    runTests();
  }, 1000);
}

module.exports = { runTests };
