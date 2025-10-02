#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║              🏠 RENTALHUB - GET STARTED SCRIPT                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the rental-marketplace directory"
    exit 1
fi

echo "Step 1: Installing dependencies..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "Step 2: Setting up database..."
npm run setup

if [ $? -ne 0 ]; then
    echo "❌ Failed to setup database"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SETUP COMPLETE!                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 RentalHub is ready to run!"
echo ""
echo "To start the server, run:"
echo ""
echo "    npm start"
echo ""
echo "Then visit:"
echo ""
echo "    🌐 Frontend:    http://localhost:3000"
echo "    👨‍💼 Admin:       http://localhost:3000/admin"
echo "    ⚡ API:         http://localhost:3000/api"
echo ""
echo "📧 Admin Login:"
echo "    Email:    admin@example.com"
echo "    Password: admin123456"
echo ""
echo "📚 For more info:"
echo "    - README.md         (full documentation)"
echo "    - QUICKSTART.md     (5-minute guide)"
echo "    - INSTALLATION_TEST.md (testing guide)"
echo ""
