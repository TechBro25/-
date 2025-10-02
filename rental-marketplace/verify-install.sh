#!/bin/bash

# RentalHub Installation Verification Script

echo "================================"
echo "RentalHub Installation Checker"
echo "================================"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found"
    exit 1
fi

echo ""
echo "Checking project structure..."

# Check required files
FILES=(
    "backend/package.json"
    "backend/.env.example"
    "backend/src/server.js"
    "backend/src/app.js"
    "backend/src/db.js"
    "backend/migrations/init.sql"
    "backend/seeds/seed.sql"
    "frontend/index.html"
    "frontend/item.html"
    "frontend/admin.html"
    "frontend/styles/main.css"
    "frontend/scripts/main.js"
    "tests/booking.test.js"
    "README.md"
)

MISSING_FILES=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo "❌ Missing $MISSING_FILES required files"
    exit 1
fi

echo ""
echo "================================"
echo "✅ All files present!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. cd backend"
echo "2. npm install"
echo "3. npm run setup"
echo "4. npm start"
echo ""
echo "Then visit http://localhost:3000"
echo ""
