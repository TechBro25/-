-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price_per_day INTEGER NOT NULL, -- Price in Naira
  deposit_amount INTEGER NOT NULL, -- Deposit in Naira
  location VARCHAR(255) NOT NULL,
  images TEXT, -- JSON array of image paths
  is_available BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  renter_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed, cancelled
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (renter_id) REFERENCES users(id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  booking_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  images TEXT, -- JSON array of image paths
  videos TEXT, -- JSON array of video paths
  is_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Messages table (inbox and WhatsApp)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER,
  receiver_id INTEGER,
  booking_id INTEGER,
  channel VARCHAR(20) NOT NULL, -- 'inbox' or 'whatsapp'
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- KYC Documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  id_document_path VARCHAR(500),
  selfie_path VARCHAR(500),
  verification_code VARCHAR(6),
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payments table (simplified)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- bank_transfer, stripe, paystack
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  proof_path VARCHAR(500), -- For bank transfer proof
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  complainant_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
  resolution TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (complainant_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_documents(user_id);