-- JeJakos Seed Data
-- Design §2, Task T-05
-- Password default semua user: admin123 (hash bcrypt)

USE jejakos;

-- 1. FASILITAS
INSERT INTO facilities (id, name) VALUES
(1, 'WiFi'),
(2, 'AC'),
(3, 'Kamar Mandi Dalam'),
(4, 'Kasur'),
(5, 'Lemari Pakaian'),
(6, 'Meja Belajar'),
(7, 'Parkir Motor'),
(8, 'Parkir Mobil'),
(9, 'Dapur Bersama'),
(10, 'Mesin Cuci'),
(11, 'Listrik Termasuk'),
(12, 'Air PDAM / Sumur Bor'),
(13, 'CCTV 24 Jam'),
(14, 'Kulkas Bersama')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. USERS (Admin, Pemilik, Pencari)
-- bcrypt hash for 'admin123': $2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK
INSERT INTO users (id, email, password_hash, role, name, phone, photo_url, is_verified, is_approved) VALUES
(1, 'admin@jejakos.id', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'admin', 'Admin JeJakos', '081234567890', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', TRUE, TRUE),
(2, 'budi.pemilik@gmail.com', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'pemilik', 'Pak Budi Santoso', '081377889900', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', TRUE, TRUE),
(3, 'siti.pemilik@gmail.com', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'pemilik', 'Ibu Siti Rahma', '082166554433', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', TRUE, TRUE),
(4, 'hendra.pemilik@gmail.com', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'pemilik', 'Pak Hendra Wijaya', '085211223344', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', TRUE, TRUE),
(5, 'ari.pencari@gmail.com', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'pencari', 'Ari Pratama', '087812345678', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', TRUE, FALSE),
(6, 'dina.pencari@gmail.com', '$2b$10$WWYIx3PbTxHXP5O.5ekLku5zkiu1qgsm0B0rit.gkqyRSvn6tEKyK', 'pencari', 'Dina Lestari', '089698765432', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', TRUE, FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), is_verified=VALUES(is_verified), is_approved=VALUES(is_approved);

-- 3. KOS DEMO (Koordinat & Alamat Nyata di Jambi)
-- MySQL 8 SRID 4326 POINT axis order: POINT(lat lng)
-- Area 1: Mendalo / UNJA (Kec. Jambi Luar Kota)
-- Area 2: Sungai Duren / UIN STS (Kec. Jambi Luar Kota)
-- Area 3: Danau Teluk / Telanaipura / UNBARI (Kec. Danau Teluk / Kota Jambi)

INSERT INTO kos (id, owner_id, name, address, location, district, type, description, is_approved, status) VALUES
(1, 2, 'Kos Putra Mendalo Asri', 'Jl. Lintas Sumatera, Lr. Nirwana No. 12, Mendalo Darat', ST_GeomFromText('POINT(-1.6140 103.5200)', 4326), 'Jambi Luar Kota', 'putra', 'Kos putra nyaman dan tenang, hanya 3 menit dari gerbang utama Universitas Jambi (UNJA Mendalo). Lingkungan aman dengan keamanan CCTV 24 jam.', TRUE, 'active'),
(2, 2, 'Kos Putri Graha Sakinah UNJA', 'Jl. Jambi - Muara Bulian KM 15, Mendalo Indah', ST_GeomFromText('POINT(-1.6115 103.5175)', 4326), 'Jambi Luar Kota', 'putri', 'Kos khusus mahasiswi UNJA, bersih, asri, dekat warung makan dan fotokopi. Dilengkapi pagar keliling dan jam malam demi keamanan.', TRUE, 'active'),
(3, 2, 'Kos Campur Mandiri Mendalo', 'Jl. Perintis Kemerdekaan, Mendalo Darat', ST_GeomFromText('POINT(-1.6160 103.5220)', 4326), 'Jambi Luar Kota', 'campur', 'Kos campur karyawan/mahasiswa dengan fasilitas lengkap, parkiran motor luas dan akses mudah ke jalan raya lintas Sumatera.', TRUE, 'active'),
(4, 3, 'Kos Putri Annisa UIN', 'Jl. Lintas Jambi - Muara Bulian KM 16, Simpang Sungai Duren', ST_GeomFromText('POINT(-1.6065 103.5095)', 4326), 'Jambi Luar Kota', 'putri', 'Kos putri strategis jalan kaki ke kampus UIN Sulthan Thaha Saifuddin Jambi. Kamar mandi dalam, suasana islami dan tenang untuk belajar.', TRUE, 'active'),
(5, 3, 'Kos Putra Al-Barokah UIN', 'Lr. Nirwana 2, Simpang Sungai Duren', ST_GeomFromText('POINT(-1.6080 103.5075)', 4326), 'Jambi Luar Kota', 'putra', 'Kos putra ekonomis dekat gerbang belakang UIN STS Jambi. Listrik dan air bersih lancar, sudah termasuk kasur dan lemari.', TRUE, 'active'),
(6, 4, 'Kos Putri Melati UNBARI', 'Jl. Slamet Riyadi No. 45, Kel. Sungai Putri', ST_GeomFromText('POINT(-1.6045 103.5930)', 4326), 'Danau Teluk', 'putri', 'Kos putri eksklusif persis di seberang Universitas Batanghari (UNBARI). Kamar ber-AC, kamar mandi dalam, dekat pusat jajanan dan minimarket.', TRUE, 'active'),
(7, 4, 'Kos Putra Batanghari Residence', 'Jl. Slamet Riyadi, Lr. Beringin No. 8, Kel. Sungai Putri', ST_GeomFromText('POINT(-1.6060 103.5945)', 4326), 'Danau Teluk', 'putra', 'Kos putra modern dekat kampus UNBARI dan kawasan Telanaipura. Fasilitas WiFi kencang, parkir motor dan dapur bersama.', TRUE, 'active'),
(8, 4, 'Kos Eksklusif Raden Mattaher', 'Jl. Raden Mattaher No. 22, Kel. Pasar Jambi', ST_GeomFromText('POINT(-1.5920 103.6180)', 4326), 'Pasar Jambi', 'campur', 'Kos eksklusif di pusat kota Jambi, dekat pusat bisnis WTC Batanghari dan perkantoran. Fasilitas lengkap AC, water heater, dan parkir mobil.', TRUE, 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), location=VALUES(location), description=VALUES(description);

-- 4. ROOMS (Kamar-kamar di setiap kos)
INSERT INTO rooms (id, kos_id, room_number, price, pay_period, description, is_available) VALUES
-- Kos 1 (Kos Putra Mendalo Asri)
(1, 1, 'Kamar A1', 550000.00, 'bulanan', 'Kamar luas 3x3 meter, ventilasi baik, kasur busa + lemari', TRUE),
(2, 1, 'Kamar A2', 550000.00, 'bulanan', 'Kamar luas 3x3 meter, dekat kamar mandi', TRUE),
(3, 1, 'Kamar B1 (KM Dalam)', 750000.00, 'bulanan', 'Kamar 3x4 meter dengan kamar mandi dalam', TRUE),

-- Kos 2 (Kos Putri Graha Sakinah UNJA)
(4, 2, 'Kamar 101', 650000.00, 'bulanan', 'Kamar lantai 1, kasur springbed single, lemari 2 pintu, meja belajar', TRUE),
(5, 2, 'Kamar 102', 650000.00, 'bulanan', 'Kamar lantai 1, jendela menghadap taman', TRUE),
(6, 2, 'Kamar 201 (VIP)', 950000.00, 'bulanan', 'Kamar lantai 2 dilengkapi AC dan kamar mandi dalam', TRUE),

-- Kos 3 (Kos Campur Mandiri Mendalo)
(7, 3, 'Kamar 01', 500000.00, 'bulanan', 'Kamar standar mahasiswa/karyawan, listrik mandiri token', TRUE),
(8, 3, 'Kamar 02', 500000.00, 'bulanan', 'Kamar standar, kasur dan meja', FALSE),

-- Kos 4 (Kos Putri Annisa UIN)
(9, 4, 'Melati 1', 600000.00, 'bulanan', 'Kamar mandi dalam, air PDAM lancar, dekat musholla', TRUE),
(10, 4, 'Melati 2', 600000.00, 'bulanan', 'Kamar mandi dalam, jendela luar, sirkulasi udara sejuk', TRUE),
(11, 4, 'Mawar 1 (Besar)', 7000000.00, 'tahunan', 'Sewa tahunan lebih hemat, muat 2 orang mahasiswi', TRUE),

-- Kos 5 (Kos Putra Al-Barokah UIN)
(12, 5, 'Kamar 01', 450000.00, 'bulanan', 'Kamar murah meriah mahasiswa, sudah termasuk kasur dan air', TRUE),
(13, 5, 'Kamar 02', 450000.00, 'bulanan', 'Kamar bersih dekat tempat wudhu dan dapur', TRUE),

-- Kos 6 (Kos Putri Melati UNBARI)
(14, 6, 'Kamar Anggrek 1', 1100000.00, 'bulanan', 'Kamar AC 3x3.5 meter, KM dalam, water heater, springbed', TRUE),
(15, 6, 'Kamar Anggrek 2', 1100000.00, 'bulanan', 'Kamar AC lantai 2, view pemandangan kota, KM dalam', TRUE),
(16, 6, 'Kamar Melati (Non-AC)', 750000.00, 'bulanan', 'Kamar kipas angin, KM dalam, springbed', TRUE),

-- Kos 7 (Kos Putra Batanghari Residence)
(17, 7, 'Kamar A-01', 800000.00, 'bulanan', 'Kamar nyaman mahasiswa UNBARI, WiFi lancar buat skripsi', TRUE),
(18, 7, 'Kamar A-02', 800000.00, 'bulanan', 'Kamar lantai 1 dekat parkiran motor', TRUE),
(19, 7, 'Kamar B-01 (AC)', 1200000.00, 'bulanan', 'Kamar ber-AC, KM dalam, meja kerja luas', FALSE),

-- Kos 8 (Kos Eksklusif Raden Mattaher)
(20, 8, 'Studio Room 1', 1500000.00, 'bulanan', 'Kamar eksekutif full furnish AC, TV, KM dalam, air panas, laundry', TRUE),
(21, 8, 'Studio Room 2', 1500000.00, 'bulanan', 'Kamar eksekutif lantai 2 dengan balkon pribadi', TRUE)
ON DUPLICATE KEY UPDATE price=VALUES(price), is_available=VALUES(is_available);

-- 5. KOS_FACILITIES (Relasi Kos & Fasilitas)
INSERT INTO kos_facilities (kos_id, facility_id) VALUES
-- Kos 1: WiFi, Kasur, Lemari, Meja Belajar, Parkir Motor, Dapur Bersama, Air PDAM
(1, 1), (1, 4), (1, 5), (1, 6), (1, 7), (1, 9), (1, 12), (1, 13),
-- Kos 2: WiFi, Kasur, Lemari, Meja Belajar, Parkir Motor, Dapur Bersama, CCTV, Air PDAM
(2, 1), (2, 4), (2, 5), (2, 6), (2, 7), (2, 9), (2, 12), (2, 13), (2, 14),
-- Kos 3: Kasur, Lemari, Parkir Motor, Air PDAM
(3, 4), (3, 5), (3, 7), (3, 12),
-- Kos 4: Kamar Mandi Dalam, Kasur, Lemari, Parkir Motor, Dapur Bersama, CCTV
(4, 3), (4, 4), (4, 5), (4, 7), (4, 9), (4, 12), (4, 13),
-- Kos 5: Kasur, Lemari, Parkir Motor, Listrik Termasuk, Air PDAM
(5, 4), (5, 5), (5, 7), (5, 11), (5, 12),
-- Kos 6: WiFi, AC, KM Dalam, Kasur, Lemari, Meja Belajar, Parkir Motor, Dapur Bersama, CCTV
(6, 1), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (6, 7), (6, 9), (6, 12), (6, 13),
-- Kos 7: WiFi, Kasur, Lemari, Meja Belajar, Parkir Motor, Dapur Bersama, Mesin Cuci
(7, 1), (7, 4), (7, 5), (7, 6), (7, 7), (7, 9), (7, 10), (7, 12),
-- Kos 8: WiFi, AC, KM Dalam, Kasur, Lemari, Meja Belajar, Parkir Motor, Parkir Mobil, CCTV, Mesin Cuci
(8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 6), (8, 7), (8, 8), (8, 10), (8, 12), (8, 13)
ON DUPLICATE KEY UPDATE kos_id=VALUES(kos_id);

-- 6. KOS_PHOTOS (Foto Demo)
INSERT INTO kos_photos (id, kos_id, room_id, photo_url, sort_order) VALUES
(1, 1, NULL, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 0),
(2, 1, 1, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', 1),
(3, 2, NULL, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 0),
(4, 2, 4, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', 1),
(5, 3, NULL, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 0),
(6, 4, NULL, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800', 0),
(7, 4, 9, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 1),
(8, 5, NULL, 'https://images.unsplash.com/photo-1540518614846-7ede433c4b49?w=800', 0),
(9, 6, NULL, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 0),
(10, 6, 14, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800', 1),
(11, 7, NULL, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 0),
(12, 8, NULL, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 0),
(13, 8, 20, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 1)
ON DUPLICATE KEY UPDATE photo_url=VALUES(photo_url);
