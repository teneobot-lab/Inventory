
-- Database: smart_inventory
CREATE DATABASE IF NOT EXISTS smart_inventory;
USE smart_inventory;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(20),
    email VARCHAR(100)
);

-- Insert Default Admin
INSERT INTO users (id, name, username, password, role, email) 
VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')
ON DUPLICATE KEY UPDATE id=id;

-- 2. Tabel Warehouses (Gudang)
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    location VARCHAR(255)
);

-- Insert Default Warehouse
INSERT INTO warehouses (id, name, location) VALUES 
('wh-main', 'Gudang Utama (Jakarta)', 'Jakarta Utara'),
('wh-dist', 'Gudang Distribusi (Bekasi)', 'Bekasi Barat')
ON DUPLICATE KEY UPDATE id=id;

-- 3. Tabel Inventory (Master Item)
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    stock DECIMAL(15, 3) DEFAULT 0,
    min_stock DECIMAL(15, 3) DEFAULT 0,
    unit VARCHAR(20),
    base_unit VARCHAR(20),
    conversions JSON,
    price DECIMAL(15, 2) DEFAULT 0,
    last_updated DATETIME
);

-- 4. Tabel Transactions (Logistics Movement)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(10), -- 'IN', 'OUT', 'TRANSFER', 'ADJUST'
    date DATETIME,
    from_warehouse_id VARCHAR(50),
    to_warehouse_id VARCHAR(50),
    reference_number VARCHAR(100),
    supplier VARCHAR(100),
    notes TEXT,
    items JSON,
    performer VARCHAR(100),
    photos JSON
);

-- 5. Tabel Stock Ledger (Audit Trail)
-- Ledger ini mencatat mutasi stok secara atomik per warehouse
CREATE TABLE IF NOT EXISTS stock_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(50),
    warehouse_id VARCHAR(50),
    tx_id VARCHAR(50),
    type VARCHAR(20), -- 'INBOUND', 'OUTBOUND', 'TRANSFER_IN', 'TRANSFER_OUT'
    quantity DECIMAL(15, 3), -- Selalu dalam Base Unit
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- 6. Tabel Reject Master & Transactions
CREATE TABLE IF NOT EXISTS reject_master (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    base_unit VARCHAR(20),
    conversions JSON
);

CREATE TABLE IF NOT EXISTS reject_transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATETIME,
    items JSON,
    created_at DATETIME
);

-- 7. Tabel Media Player
CREATE TABLE IF NOT EXISTS playlists (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS playlist_items (
    id VARCHAR(50) PRIMARY KEY,
    playlist_id VARCHAR(50),
    title VARCHAR(255),
    url VARCHAR(255),
    video_id VARCHAR(50),
    created_at DATETIME,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
