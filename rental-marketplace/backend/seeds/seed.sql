-- Insert admin user
INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin, is_verified) VALUES 
('admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J5J5J5J5J', 'Admin', 'User', '09154609327', 1, 1);

-- Insert demo users
INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin, is_verified) VALUES 
('john.doe@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J5J5J5J5J', 'John', 'Doe', '08012345678', 0, 1),
('jane.smith@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J5J5J5J5J', 'Jane', 'Smith', '08087654321', 0, 1),
('mike.johnson@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J5J5J5J5J', 'Mike', 'Johnson', '08098765432', 0, 0),
('sarah.wilson@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J5J5J5J5J', 'Sarah', 'Wilson', '08054321098', 0, 1);

-- Insert demo items
INSERT INTO items (owner_id, title, description, category, price_per_day, deposit_amount, location, images, is_available) VALUES 
(2, 'Elegant Wedding Dress - Size M', 'Beautiful white wedding dress perfect for your special day. Includes veil and accessories. Dry cleaned and ready to wear.', 'Wedding', 25000, 50000, 'Victoria Island, Lagos', '["/uploads/placeholder/wedding_dress_01.jpg", "/uploads/placeholder/wedding_dress_02.jpg"]', 1),
(2, 'Professional Camera Kit', 'Complete photography kit including DSLR camera, lenses, tripod, and lighting equipment. Perfect for events and portraits.', 'Electronics', 15000, 30000, 'Ikoyi, Lagos', '["/uploads/placeholder/camera_kit_01.jpg", "/uploads/placeholder/camera_kit_02.jpg"]', 1),
(3, 'Luxury Car - Toyota Camry 2020', 'Well-maintained Toyota Camry with full insurance. Perfect for weddings, business meetings, or special occasions.', 'Vehicles', 35000, 100000, 'Lekki, Lagos', '["/uploads/placeholder/camry_01.jpg", "/uploads/placeholder/camry_02.jpg"]', 1),
(3, 'Sound System Package', 'Professional sound system with speakers, microphones, and mixing board. Ideal for parties and events.', 'Electronics', 20000, 40000, 'Surulere, Lagos', '["/uploads/placeholder/sound_system_01.jpg", "/uploads/placeholder/sound_system_02.jpg"]', 1),
(4, 'Traditional Wedding Attire', 'Complete traditional wedding outfit including gele, buba, and wrapper. Available in various colors and sizes.', 'Wedding', 18000, 35000, 'Ikeja, Lagos', '["/uploads/placeholder/traditional_attire_01.jpg", "/uploads/placeholder/traditional_attire_02.jpg"]', 1),
(4, 'Event Tent and Chairs', 'Large event tent with 100 chairs and tables. Perfect for outdoor weddings and parties.', 'Events', 25000, 50000, 'Gbagada, Lagos', '["/uploads/placeholder/tent_chairs_01.jpg", "/uploads/placeholder/tent_chairs_02.jpg"]', 1),
(5, 'DJ Equipment Set', 'Complete DJ setup with turntables, mixer, and speakers. Includes music library and lighting effects.', 'Electronics', 22000, 45000, 'Yaba, Lagos', '["/uploads/placeholder/dj_equipment_01.jpg", "/uploads/placeholder/dj_equipment_02.jpg"]', 1),
(5, 'Catering Equipment', 'Professional catering equipment including warmers, serving dishes, and utensils for 100+ guests.', 'Events', 12000, 25000, 'Mushin, Lagos', '["/uploads/placeholder/catering_equipment_01.jpg", "/uploads/placeholder/catering_equipment_02.jpg"]', 1);

-- Insert demo bookings
INSERT INTO bookings (item_id, renter_id, start_date, end_date, total_amount, deposit_amount, status, payment_status) VALUES 
(1, 3, '2025-02-14', '2025-02-15', 25000, 50000, 'completed', 'paid'),
(2, 4, '2025-01-20', '2025-01-22', 30000, 30000, 'completed', 'paid'),
(3, 2, '2025-03-10', '2025-03-12', 70000, 100000, 'approved', 'paid'),
(4, 5, '2025-02-28', '2025-03-01', 20000, 40000, 'pending', 'pending'),
(5, 2, '2025-04-15', '2025-04-16', 18000, 35000, 'approved', 'paid'),
(6, 3, '2025-05-01', '2025-05-03', 50000, 50000, 'pending', 'pending');

-- Insert sample reviews (the 10 reviews from the spec)
INSERT INTO reviews (item_id, booking_id, reviewer_id, rating, title, comment, images, is_verified, is_approved) VALUES 
(1, 1, 3, 5, 'Absolutely stunning dress!', 'The wedding dress was perfect for my special day. It fit beautifully and looked exactly like the photos. The owner was very helpful and the dress was in excellent condition.', '["/uploads/placeholder/aisha_wedding_01.jpg"]', 1, 1),
(2, 2, 4, 4, 'Great camera equipment', 'The camera kit was exactly what I needed for my event photography. Everything worked perfectly and the quality was excellent. Highly recommend!', '["/uploads/placeholder/emeka_camera_01.jpg"]', 1, 1),
(3, 3, 2, 5, 'Luxury car experience', 'The Toyota Camry was in perfect condition and made our wedding day extra special. Clean, comfortable, and reliable. The owner was very professional.', '["/uploads/placeholder/fatima_car_01.jpg"]', 1, 1),
(4, 4, 5, 4, 'Excellent sound system', 'The sound system worked flawlessly for our party. Great quality sound and all equipment was in perfect working order. Would definitely rent again.', '["/uploads/placeholder/kemi_sound_01.jpg"]', 1, 1),
(5, 5, 2, 5, 'Beautiful traditional attire', 'The traditional wedding outfit was gorgeous and fit perfectly. The colors were vibrant and the quality was outstanding. Made our traditional ceremony memorable.', '["/uploads/placeholder/adebayo_traditional_01.jpg"]', 1, 1),
(6, 6, 3, 4, 'Perfect for outdoor events', 'The tent and chairs were exactly what we needed for our outdoor wedding. Everything was clean and well-maintained. Great value for money.', '["/uploads/placeholder/chioma_tent_01.jpg"]', 1, 1),
(1, 1, 3, 5, 'Exceeded expectations', 'The wedding dress was even more beautiful in person than in the photos. The owner was very accommodating and the dress was delivered on time. Highly recommended!', '["/uploads/placeholder/blessing_dress_01.jpg"]', 1, 1),
(2, 2, 4, 4, 'Professional equipment', 'As a professional photographer, I was impressed with the quality of the camera equipment. Everything was clean and well-maintained. Great rental experience.', '["/uploads/placeholder/olamide_camera_01.jpg"]', 1, 1),
(3, 3, 2, 5, 'Wedding day perfection', 'The car was perfect for our wedding day. Clean, comfortable, and the driver was very professional. Made our special day even more memorable.', '["/uploads/placeholder/grace_car_01.jpg"]', 1, 1),
(4, 4, 5, 4, 'Great party equipment', 'The sound system made our party a huge success. Great sound quality and all equipment worked perfectly. The owner was very helpful with setup.', '["/uploads/placeholder/tunde_sound_01.jpg"]', 1, 1);

-- Insert demo messages
INSERT INTO messages (sender_id, receiver_id, booking_id, channel, subject, body) VALUES 
(3, 2, 1, 'inbox', 'Wedding Dress Inquiry', 'Hi! I am interested in renting your wedding dress for my wedding on February 14th. Could you please provide more details about the size and availability?'),
(2, 3, 1, 'inbox', 'Re: Wedding Dress Inquiry', 'Hello! The dress is size M and is available for your date. It includes a veil and accessories. The rental fee is ₦25,000 per day with a ₦50,000 deposit.'),
(4, 3, 2, 'inbox', 'Camera Equipment Question', 'I need the camera kit for a 2-day event. Are all the lenses included and is there a backup camera available?'),
(3, 4, 2, 'inbox', 'Re: Camera Equipment Question', 'Yes, the kit includes multiple lenses and I can provide a backup camera. The total for 2 days would be ₦30,000 plus ₦30,000 deposit.'),
(5, 2, 3, 'inbox', 'Car Rental Inquiry', 'I am interested in renting your Toyota Camry for my wedding. Is it available for March 10-12?'),
(2, 5, 3, 'inbox', 'Re: Car Rental Inquiry', 'Yes, the car is available for those dates. The rental fee is ₦35,000 per day with a ₦100,000 deposit. Full insurance is included.'),
(NULL, NULL, NULL, 'whatsapp', 'WhatsApp Message', 'From: 08012345678\nMessage: Hi, I would like to inquire about your wedding dress rental. Is it still available?'),
(NULL, NULL, NULL, 'whatsapp', 'WhatsApp Message', 'From: 08087654321\nMessage: Thank you for the quick response! I will proceed with the booking.');

-- Insert demo KYC documents
INSERT INTO kyc_documents (user_id, id_document_path, selfie_path, verification_code, status) VALUES 
(4, '/uploads/kyc/mike_id.jpg', '/uploads/kyc/mike_selfie.jpg', '123456', 'pending'),
(5, '/uploads/kyc/sarah_id.jpg', '/uploads/kyc/sarah_selfie.jpg', '789012', 'verified');

-- Insert demo payments
INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) VALUES 
(1, 75000, 'bank_transfer', 'TXN001', 'completed'),
(2, 60000, 'stripe', 'TXN002', 'completed'),
(3, 170000, 'paystack', 'TXN003', 'completed'),
(4, 60000, 'bank_transfer', 'TXN004', 'pending'),
(5, 53000, 'stripe', 'TXN005', 'completed'),
(6, 100000, 'paystack', 'TXN006', 'pending');