-- Insert admin user (password: admin123456)
INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES
('admin@example.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'Admin User', '09154609327', 'admin', 1);

-- Insert demo users (password: password123)
INSERT INTO users (email, password_hash, full_name, phone, is_verified) VALUES
('aisha.bello@email.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'Aisha Bello', '08012345678', 1),
('emeka.okonkwo@email.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'Emeka Okonkwo', '08123456789', 1),
('fatima.ahmed@email.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'Fatima Ahmed', '08098765432', 1),
('chioma.nwankwo@email.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'Chioma Nwankwo', '08087654321', 1),
('john.owner@email.com', '$2b$10$mF8KvJZO.qHpRGQ5pOXZPOZGlG5iKZiKZiKZiKZiKZiKZiKZiKa', 'John Owner', '08011223344', 1);

-- Insert demo items
INSERT INTO items (owner_id, title, description, category, price_per_day, deposit_amount, location, images, rating, review_count) VALUES
(6, 'White Wedding Tent (500 capacity)', 'Beautiful white wedding tent perfect for outdoor ceremonies and receptions. Includes setup and takedown service.', 'Event Equipment', 150000, 50000, 'Lagos, Nigeria', '["placeholder/wedding_tent_01.jpg","placeholder/wedding_tent_02.jpg"]', 5.0, 3),
(6, 'Professional Sound System', 'High-quality PA system with speakers, mixer, and microphones. Perfect for weddings, conferences, and parties.', 'Event Equipment', 45000, 20000, 'Lagos, Nigeria', '["placeholder/sound_system_01.jpg"]', 4.8, 2),
(6, 'Canon EOS R5 Camera Kit', 'Professional camera with lenses for weddings, events, and photo shoots. Includes stabilizer and accessories.', 'Photography', 35000, 100000, 'Abuja, Nigeria', '["placeholder/camera_01.jpg","placeholder/camera_02.jpg"]', 4.9, 2),
(6, 'Luxury Car - Mercedes E-Class', 'Elegant Mercedes E-Class for weddings, proms, and special events. Comes with professional driver.', 'Vehicles', 80000, 50000, 'Lagos, Nigeria', '["placeholder/mercedes_01.jpg"]', 5.0, 1),
(6, 'Portable Generator 10KVA', 'Reliable 10KVA generator for events, construction, or backup power. Fuel-efficient and quiet operation.', 'Power Equipment', 25000, 30000, 'Port Harcourt, Nigeria', '["placeholder/generator_01.jpg"]', 4.5, 1),
(6, 'Party Chairs (100 units)', 'Comfortable chiavari chairs available in gold, silver, and white. Perfect for weddings and events.', 'Event Equipment', 30000, 10000, 'Lagos, Nigeria', '["placeholder/chairs_01.jpg"]', 4.7, 1),
(6, 'Inflatable Bouncy Castle', 'Colorful bouncy castle for kids parties and events. Safe, clean, and includes setup service.', 'Party Supplies', 20000, 15000, 'Lagos, Nigeria', '["placeholder/bouncy_01.jpg"]', 0, 0),
(6, 'Projector and Screen Package', 'HD projector with 10ft screen for presentations, movie nights, and events.', 'Event Equipment', 15000, 10000, 'Abuja, Nigeria', '["placeholder/projector_01.jpg"]', 0, 0),
(6, 'Industrial Cleaning Machine', 'High-powered carpet and floor cleaning machine for deep cleaning services.', 'Cleaning Equipment', 12000, 20000, 'Lagos, Nigeria', '["placeholder/cleaner_01.jpg"]', 0, 0),
(6, 'DJ Equipment Set', 'Complete DJ setup with turntables, mixer, and speakers. Perfect for parties and events.', 'Event Equipment', 40000, 25000, 'Lagos, Nigeria', '["placeholder/dj_01.jpg"]', 0, 0);

-- Insert demo bookings
INSERT INTO bookings (item_id, renter_id, owner_id, start_date, end_date, total_days, total_price, deposit_amount, status, payment_status) VALUES
(1, 2, 6, '2025-08-15', '2025-08-17', 3, 450000, 50000, 'completed', 'paid'),
(2, 3, 6, '2025-09-01', '2025-09-02', 2, 90000, 20000, 'completed', 'paid'),
(3, 4, 6, '2025-07-20', '2025-07-21', 2, 70000, 100000, 'completed', 'paid'),
(4, 5, 6, '2025-06-10', '2025-06-11', 2, 160000, 50000, 'completed', 'paid'),
(5, 2, 6, '2025-05-15', '2025-05-17', 3, 75000, 30000, 'completed', 'paid'),
(6, 3, 6, '2025-09-05', '2025-09-06', 2, 60000, 10000, 'completed', 'paid'),
(1, 4, 6, '2025-10-15', '2025-10-17', 3, 450000, 50000, 'pending', 'pending'),
(3, 5, 6, '2025-10-20', '2025-10-22', 3, 105000, 100000, 'approved', 'partial');

-- Insert sample reviews (the 10 reviews from spec)
INSERT INTO reviews (item_id, booking_id, user_id, rating, comment, media, created_at) VALUES
(1, 1, 2, 5, 'Absolutely perfect for my wedding! The tent was pristine, setup was seamless, and the team was so professional. Made our outdoor ceremony absolutely magical. Highly recommend!', '["placeholder/aisha_wedding_01.jpg","placeholder/aisha_wedding_02.jpg"]', '2025-08-20 14:30:00'),
(2, 2, 3, 5, 'Crystal clear sound quality! Rented for my sister''s wedding and everyone could hear perfectly. The owner was very helpful with setup instructions. Will definitely rent again.', '["placeholder/emeka_sound_01.jpg"]', '2025-09-03 10:15:00'),
(3, 3, 4, 5, 'Amazing camera quality! Captured my best friend''s wedding beautifully. The owner provided great tips on settings. Photos came out professional-grade.', '["placeholder/fatima_camera_01.jpg","placeholder/fatima_camera_02.jpg","placeholder/fatima_camera_03.jpg"]', '2025-07-23 16:45:00'),
(4, 4, 5, 5, 'Luxurious and well-maintained! Made my daughter''s prom night extra special. The driver was courteous and punctual. Worth every naira!', NULL, '2025-06-12 11:20:00'),
(5, 5, 2, 4, 'Reliable generator, worked perfectly throughout our 3-day event. Only small issue was it was a bit louder than expected, but still very satisfied.', NULL, '2025-05-18 09:30:00'),
(6, 6, 3, 5, 'Beautiful chairs! Guests complimented how elegant they looked. Clean, sturdy, and the gold finish was stunning. Delivery was on time too.', '["placeholder/emeka_chairs_01.jpg"]', '2025-09-07 15:00:00'),
(1, 1, 2, 5, 'Second review - wanted to add that the customer service was exceptional. They checked in during the event to make sure everything was perfect!', NULL, '2025-08-21 10:00:00'),
(2, 2, 3, 5, 'Follow-up: The pickup was just as smooth as the delivery. Very professional service from start to finish.', NULL, '2025-09-04 14:30:00'),
(3, 3, 4, 5, 'Update: Owner even followed up after the event to see how everything went. That level of care is rare. 10/10 service!', NULL, '2025-07-25 12:00:00'),
(1, 1, 2, 5, 'Final note: The tent held up perfectly even when it drizzled. Quality materials and construction. Can''t thank them enough!', '["placeholder/aisha_wedding_03.jpg"]', '2025-08-22 18:45:00');

-- Update item ratings based on reviews
UPDATE items SET rating = 5.0, review_count = 4 WHERE id = 1;
UPDATE items SET rating = 5.0, review_count = 2 WHERE id = 2;
UPDATE items SET rating = 5.0, review_count = 3 WHERE id = 3;
UPDATE items SET rating = 5.0, review_count = 1 WHERE id = 4;
UPDATE items SET rating = 4.0, review_count = 1 WHERE id = 5;
UPDATE items SET rating = 5.0, review_count = 1 WHERE id = 6;

-- Insert some demo messages
INSERT INTO messages (booking_id, sender_id, receiver_id, channel, subject, body) VALUES
(7, 4, 6, 'inbox', 'Question about booking #7', 'Hi, I would like to confirm if the tent includes tables and chairs or if those are separate?'),
(7, 6, 4, 'inbox', 'Re: Question about booking #7', 'Hello! The tent rental is for the structure only. Tables and chairs are available as separate items. Please check item #6 for chairs.'),
(8, 5, 6, 'inbox', 'Deposit payment confirmation', 'I have sent the deposit via bank transfer. Reference: TRF20251002001. Please confirm receipt.');

-- Insert demo WhatsApp messages (simulated)
INSERT INTO messages (sender_phone, channel, body, created_at) VALUES
('08012345678', 'whatsapp', 'Hello, I am interested in renting the wedding tent for December. Is it available?', '2025-10-01 09:15:00'),
('08123456789', 'whatsapp', 'My verification code is 123456', '2025-10-01 14:30:00');
