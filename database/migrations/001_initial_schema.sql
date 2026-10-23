-- JeJakos Initial Schema Migration
-- Design §2: all 13 tables
-- Run: mysql -u root jejakos < database/migrations/001_initial_schema.sql

CREATE DATABASE IF NOT EXISTS jejakos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jejakos;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('pencari','pemilik','admin') NOT NULL,
  name            VARCHAR(255),
  phone           VARCHAR(20),
  photo_url       VARCHAR(500),
  is_verified     BOOLEAN DEFAULT FALSE,
  is_approved     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. KOS (properti)
-- ============================================================
CREATE TABLE IF NOT EXISTS kos (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  owner_id        INT NOT NULL,
  name            VARCHAR(255) NOT NULL,
  address         TEXT NOT NULL,
  location        POINT NOT NULL /*!80003 SRID 4326 */,
  district        VARCHAR(100),
  type            ENUM('putra','putri','campur') NOT NULL,
  description     TEXT,
  is_approved     BOOLEAN DEFAULT FALSE,
  status          ENUM('active','inactive') DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  SPATIAL INDEX idx_kos_location (location),
  CONSTRAINT fk_kos_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. ROOMS (kamar)
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  kos_id          INT NOT NULL,
  room_number     VARCHAR(50),
  price           DECIMAL(12,2) NOT NULL,
  pay_period      ENUM('bulanan','tahunan') DEFAULT 'bulanan',
  description     TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rooms_kos FOREIGN KEY (kos_id) REFERENCES kos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. FACILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ============================================================
-- 5. KOS_FACILITIES (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS kos_facilities (
  kos_id          INT NOT NULL,
  facility_id     INT NOT NULL,
  PRIMARY KEY (kos_id, facility_id),
  CONSTRAINT fk_kosfac_kos FOREIGN KEY (kos_id) REFERENCES kos(id) ON DELETE CASCADE,
  CONSTRAINT fk_kosfac_fac FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. KOS_PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS kos_photos (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  kos_id          INT NOT NULL,
  room_id         INT,
  photo_url       VARCHAR(500) NOT NULL,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photos_kos FOREIGN KEY (kos_id) REFERENCES kos(id) ON DELETE CASCADE,
  CONSTRAINT fk_photos_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 7. BOOKINGS (pemesanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  room_id         INT NOT NULL,
  tenant_id       INT NOT NULL,
  status          ENUM('pending','accepted','rejected','active','completed','cancelled') DEFAULT 'pending',
  check_in_date   DATE,
  check_out_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. INVOICES (tagihan)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  booking_id      INT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  due_date        DATE NOT NULL,
  status          ENUM('unpaid','paid','overdue') DEFAULT 'unpaid',
  payment_method  ENUM('qris','manual','transfer') NULL,
  payment_ref     VARCHAR(255),
  paid_at         TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user1_id        INT NOT NULL,
  user2_id        INT NOT NULL,
  kos_id          INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conv_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_kos FOREIGN KEY (kos_id) REFERENCES kos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 10. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id       INT NOT NULL,
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. REVIEWS (ulasan)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  kos_id          INT NOT NULL,
  booking_id      INT NOT NULL,
  user_id         INT NOT NULL,
  rating          TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         TEXT,
  is_moderated    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_booking (booking_id),
  CONSTRAINT fk_reviews_kos FOREIGN KEY (kos_id) REFERENCES kos(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. COMPLAINTS (pengaduan)
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  booking_id      INT NOT NULL,
  user_id         INT NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  status          ENUM('open','in_progress','resolved') DEFAULT 'open',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 13. COMPLAINT_RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_responses (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  complaint_id    INT NOT NULL,
  user_id         INT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compresp_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_compresp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 14. CHATBOT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_logs (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT NOT NULL,
  session_id      VARCHAR(100),
  user_message    TEXT NOT NULL,
  bot_response    TEXT NOT NULL,
  kos_ids_shown   JSON,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chatlog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
