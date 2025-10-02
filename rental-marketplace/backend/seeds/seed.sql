-- Insert admin user
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, is_admin, is_verified) VALUES 
(1, 'admin@example.com', '$2b$10$8K1p/a0dLN7yVQRuHK2NWOeQs4TtMRrqP5D3kEcvMlJGf6hL9mN8W', 'Admin', 'User', TRUE, TRUE);

-- Insert demo users (password: password123)
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, phone, is_verified) VALUES 
(2, 'aisha.bello@email.com', '$2b$10$8K1p/a0dLN7yVQRuHK2NWOeQs4TtMRrqP5D3kEcvMlJGf6hL9mN8W', 'Aisha', 'Bello', '08123456789', TRUE),
(3, 'emeka.okonkwo@email.com', '$2b$10$8K1p/a0dLN7yVQRuHK2NWOeQs4TtMRrqP5D3kEcvMlJGf6hL9mN8W', 'Emeka', 'Okonkwo', '08134567890', TRUE),
(4, 'fatima.ibrahim@email.com', '$2b$10$8K1p/a0dLN7yVQRuHK2NWOeQs4TtMRrqP5D3kEcvMlJGf6hL9mN8W', 'Fatima', 'Ibrahim', '08145678901', TRUE),
(5, 'kemi.adebayo@email.com', '$2b$10$8K1p/a0dLN7yVQRuHK2NWOeQs4TtMRrqP5D3kEcvMlJGf6hL9mN8W', 'Kemi', 'Adebayo', '08156789012', TRUE);

-- Insert demo items
INSERT OR IGNORE INTO items (id, owner_id, title, description, category, price_per_day, deposit_amount, location, images, is_available) VALUES 
(1, 2, 'Elegant Wedding Dress', 'Beautiful white wedding dress, size 10-12, perfect for your special day', 'Wedding', 15000.00, 50000.00, 'Lagos, Nigeria', '["placeholder/wedding_dress_01.jpg", "placeholder/wedding_dress_02.jpg"]', TRUE),
(2, 3, 'Professional Camera Equipment', 'Canon EOS R5 with 24-70mm lens, perfect for events and photography', 'Electronics', 25000.00, 100000.00, 'Abuja, Nigeria', '["placeholder/camera_01.jpg", "placeholder/camera_02.jpg"]', TRUE),
(3, 4, 'Luxury Car - BMW X5', '2022 BMW X5, fully loaded with GPS and premium sound system', 'Vehicles', 45000.00, 200000.00, 'Port Harcourt, Nigeria', '["placeholder/bmw_x5_01.jpg", "placeholder/bmw_x5_02.jpg"]', TRUE),
(4, 2, 'Party Tent 20x30', 'Large white party tent, perfect for outdoor events and celebrations', 'Events', 12000.00, 30000.00, 'Lagos, Nigeria', '["placeholder/party_tent_01.jpg", "placeholder/party_tent_02.jpg"]', TRUE),
(5, 5, 'DJ Sound System', 'Professional DJ equipment with speakers, mixer, and microphones', 'Electronics', 18000.00, 75000.00, 'Kano, Nigeria', '["placeholder/dj_system_01.jpg", "placeholder/dj_system_02.jpg"]', TRUE),
(6, 3, 'Traditional Agbada', 'Authentic Nigerian Agbada, perfect for traditional ceremonies', 'Clothing', 8000.00, 25000.00, 'Abuja, Nigeria', '["placeholder/agbada_01.jpg", "placeholder/agbada_02.jpg"]', TRUE),
(7, 4, 'Catering Equipment Set', 'Complete catering setup including chafing dishes, serving utensils', 'Events', 22000.00, 60000.00, 'Port Harcourt, Nigeria', '["placeholder/catering_01.jpg", "placeholder/catering_02.jpg"]', TRUE),
(8, 2, 'Projector and Screen', 'HD projector with 100-inch screen for presentations and movies', 'Electronics', 10000.00, 40000.00, 'Lagos, Nigeria', '["placeholder/projector_01.jpg", "placeholder/projector_02.jpg"]', TRUE);

-- Insert demo bookings
INSERT OR IGNORE INTO bookings (id, item_id, renter_id, owner_id, start_date, end_date, total_amount, deposit_amount, status, payment_status) VALUES 
(1, 1, 3, 2, '2025-01-15', '2025-01-16', 15000.00, 50000.00, 'completed', 'paid'),
(2, 2, 4, 3, '2025-02-10', '2025-02-12', 50000.00, 100000.00, 'completed', 'paid'),
(3, 3, 5, 4, '2025-03-05', '2025-03-07', 90000.00, 200000.00, 'completed', 'paid'),
(4, 4, 3, 2, '2025-04-20', '2025-04-21', 12000.00, 30000.00, 'completed', 'paid'),
(5, 5, 2, 5, '2025-05-12', '2025-05-13', 18000.00, 75000.00, 'completed', 'paid'),
(6, 6, 4, 3, '2025-06-08', '2025-06-09', 8000.00, 25000.00, 'active', 'paid'),
(7, 7, 5, 4, '2025-07-15', '2025-07-16', 22000.00, 60000.00, 'approved', 'paid'),
(8, 8, 3, 2, '2025-08-22', '2025-08-23', 10000.00, 40000.00, 'pending', 'pending');

-- Insert sample reviews (using the specified sample reviews)
INSERT OR IGNORE INTO reviews (id, booking_id, item_id, reviewer_id, rating, comment, images, is_verified, created_at) VALUES 
(1, 1, 1, 3, 5, 'Absolutely stunning dress! Perfect fit and made my wedding day magical. Aisha was so helpful throughout the process.', '["placeholder/review_wedding_01.jpg", "placeholder/review_wedding_02.jpg"]', TRUE, '2025-01-17 14:30:00'),
(2, 2, 2, 4, 5, 'Amazing camera quality! Captured every moment of our event perfectly. Emeka provided excellent instructions and support.', '["placeholder/review_camera_01.jpg"]', TRUE, '2025-02-13 16:45:00'),
(3, 3, 5, 5, 4, 'Great car for our family trip! Clean, comfortable, and reliable. Would definitely rent again from this owner.', '["placeholder/review_car_01.jpg", "placeholder/review_car_02.jpg"]', TRUE, '2025-03-08 10:20:00'),
(4, 4, 4, 3, 5, 'Perfect tent for our outdoor celebration! Easy setup and great quality. Highly recommend for any event.', '["placeholder/review_tent_01.jpg"]', TRUE, '2025-04-22 18:15:00'),
(5, 5, 5, 2, 4, 'Excellent sound system! Clear audio and easy to use. Made our party unforgettable. Kemi was very professional.', '["placeholder/review_dj_01.jpg"]', TRUE, '2025-05-14 12:00:00'),
(6, 1, 1, 3, 5, 'Second time renting from Aisha. Consistent quality and service. The dress was exactly as described and photographed beautifully.', '[]', TRUE, '2025-01-18 09:30:00'),
(7, 2, 2, 4, 5, 'Professional grade equipment at a fair price. Emeka knows his cameras and provided valuable tips for our shoot.', '["placeholder/review_camera_02.jpg"]', TRUE, '2025-02-14 11:20:00'),
(8, 3, 3, 5, 5, 'Luxury experience from start to finish. The BMW was immaculate and performed flawlessly during our business trip.', '["placeholder/review_bmw_01.jpg"]', TRUE, '2025-03-09 15:45:00'),
(9, 4, 4, 3, 4, 'Good quality tent that served our needs well. Setup instructions were clear and the material felt durable.', '[]', TRUE, '2025-04-23 13:10:00'),
(10, 5, 5, 2, 5, 'Outstanding DJ equipment! The sound quality exceeded our expectations. Kemi even helped with setup recommendations.', '["placeholder/review_dj_02.jpg", "placeholder/review_dj_03.jpg"]', TRUE, '2025-05-15 17:30:00');

-- Insert sample messages
INSERT OR IGNORE INTO messages (id, booking_id, sender_id, recipient_id, channel, message_text, is_read) VALUES 
(1, 8, 3, 2, 'inbox', 'Hi! I am interested in renting your projector for next weekend. Is it available?', FALSE),
(2, 8, 2, 3, 'inbox', 'Hello! Yes, the projector is available. The rental includes the screen and all cables. When do you need it?', TRUE),
(3, 7, 5, 4, 'inbox', 'Thank you for approving my catering equipment booking. What time can I pick it up?', FALSE),
(4, NULL, NULL, 1, 'whatsapp', 'Hello, I need help with my booking verification. My code is 123456', FALSE);

-- Insert sample KYC documents
INSERT OR IGNORE INTO kyc_documents (id, user_id, id_document_path, selfie_path, verification_code, status) VALUES 
(1, 2, 'uploads/kyc/aisha_id.jpg', 'uploads/kyc/aisha_selfie.jpg', '123456', 'verified'),
(2, 3, 'uploads/kyc/emeka_id.jpg', 'uploads/kyc/emeka_selfie.jpg', '789012', 'verified'),
(3, 4, 'uploads/kyc/fatima_id.jpg', 'uploads/kyc/fatima_selfie.jpg', '345678', 'pending');