
-- Buat Database
CREATE DATABASE IF NOT EXISTS smart_inventory;
USE smart_inventory;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255), -- Disarankan menggunakan hash di production
    role VARCHAR(20),
    email VARCHAR(100)
);

-- Insert Default Admin (Username: admin, Password: 22)
INSERT INTO users (id, name, username, password, role, email) 
VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')
ON DUPLICATE KEY UPDATE id=id;

-- 2. Tabel Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    stock DECIMAL(15, 3) DEFAULT 0, -- Changed from INT to DECIMAL to support fractions (e.g. 0.5 kg)
    min_stock DECIMAL(15, 3) DEFAULT 0, -- Changed from INT to DECIMAL
    unit VARCHAR(20),
    conversions JSON, -- Menyimpan array object konversi
    price DECIMAL(15, 2) DEFAULT 0,
    last_updated DATETIME
);

-- 3. Tabel Transactions (Masuk & Keluar)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(10), -- 'IN' atau 'OUT'
    date DATETIME,
    reference_number VARCHAR(100),
    supplier VARCHAR(100),
    notes TEXT,
    photos JSON, -- Array base64 strings
    items JSON, -- Array object item transaksi
    performer VARCHAR(100)
);

-- 4. Tabel Reject Master (Barang Reject)
CREATE TABLE IF NOT EXISTS reject_master (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    base_unit VARCHAR(20),
    conversions JSON
);

-- 5. Tabel Reject Transactions
CREATE TABLE IF NOT EXISTS reject_transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATETIME,
    items JSON,
    created_at DATETIME
);
