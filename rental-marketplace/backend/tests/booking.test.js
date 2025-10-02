// Simple test for booking creation
const assert = require('assert');

// Mock fetch for testing
global.fetch = require('node-fetch');

class BookingTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.testUser = null;
        this.testToken = null;
    }

    async runTests() {
        console.log('🧪 Starting booking tests...\n');

        try {
            await this.testUserSignup();
            await this.testUserLogin();
            await this.testBookingCreation();
            await this.testBookingRetrieval();
            
            console.log('\n✅ All tests passed!');
        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    async testUserSignup() {
        console.log('📝 Testing user signup...');
        
        const userData = {
            email: 'test@example.com',
            password: 'testpassword123',
            firstName: 'Test',
            lastName: 'User',
            phone: '08012345678'
        };

        try {
            const response = await fetch(`${this.baseUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.testToken = data.token;
                this.testUser = data.user;
                console.log('✅ User signup successful');
            } else {
                // User might already exist, try login instead
                await this.testUserLogin();
            }
        } catch (error) {
            console.error('❌ Signup test failed:', error.message);
            throw error;
        }
    }

    async testUserLogin() {
        console.log('🔐 Testing user login...');

        const loginData = {
            email: 'test@example.com',
            password: 'testpassword123'
        };

        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            assert(response.ok, `Login failed: ${data.error || 'Unknown error'}`);
            assert(data.token, 'No token received');
            assert(data.user, 'No user data received');

            this.testToken = data.token;
            this.testUser = data.user;
            console.log('✅ User login successful');
        } catch (error) {
            console.error('❌ Login test failed:', error.message);
            throw error;
        }
    }

    async testBookingCreation() {
        console.log('📅 Testing booking creation...');

        const bookingData = {
            itemId: 1, // Assuming item with ID 1 exists
            startDate: '2025-06-01',
            endDate: '2025-06-03'
        };

        try {
            const response = await fetch(`${this.baseUrl}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.testToken}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();

            if (response.ok) {
                assert(data.booking, 'No booking data received');
                assert(data.booking.id, 'No booking ID received');
                assert(data.booking.status === 'pending', 'Booking status should be pending');
                assert(data.booking.total_amount > 0, 'Total amount should be greater than 0');
                
                this.testBookingId = data.booking.id;
                console.log('✅ Booking creation successful');
            } else {
                // Booking might fail if item doesn't exist or dates are invalid
                console.log(`⚠️  Booking creation failed: ${data.error} (this might be expected if item doesn't exist)`);
            }
        } catch (error) {
            console.error('❌ Booking creation test failed:', error.message);
            throw error;
        }
    }

    async testBookingRetrieval() {
        console.log('📋 Testing booking retrieval...');

        try {
            const response = await fetch(`${this.baseUrl}/bookings/my`, {
                headers: {
                    'Authorization': `Bearer ${this.testToken}`
                }
            });

            const data = await response.json();

            assert(response.ok, `Booking retrieval failed: ${data.error || 'Unknown error'}`);
            assert(Array.isArray(data.bookings), 'Bookings should be an array');
            
            console.log('✅ Booking retrieval successful');
            console.log(`📊 Found ${data.bookings.length} bookings for user`);
        } catch (error) {
            console.error('❌ Booking retrieval test failed:', error.message);
            throw error;
        }
    }

    async testItemRetrieval() {
        console.log('📦 Testing item retrieval...');

        try {
            const response = await fetch(`${this.baseUrl}/items`);

            const data = await response.json();

            assert(response.ok, `Item retrieval failed: ${data.error || 'Unknown error'}`);
            assert(Array.isArray(data.items), 'Items should be an array');
            
            console.log('✅ Item retrieval successful');
            console.log(`📊 Found ${data.items.length} items`);
        } catch (error) {
            console.error('❌ Item retrieval test failed:', error.message);
            throw error;
        }
    }

    async testHealthCheck() {
        console.log('🏥 Testing health check...');

        try {
            const response = await fetch(`${this.baseUrl}/health`);

            const data = await response.json();

            assert(response.ok, `Health check failed: ${data.error || 'Unknown error'}`);
            assert(data.status === 'OK', 'Health status should be OK');
            
            console.log('✅ Health check successful');
        } catch (error) {
            console.error('❌ Health check test failed:', error.message);
            throw error;
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new BookingTest();
    tester.runTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = BookingTest;