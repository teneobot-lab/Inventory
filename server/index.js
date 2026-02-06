
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Helper: Convert Snake to Camel and Parse JSON fields
const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    const newO = {};
    Object.keys(o).forEach(key => {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = o[key];
        const jsonFields = ['conversions', 'items', 'photos'];
        if (jsonFields.includes(newKey) || jsonFields.includes(key)) {
            try { value = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

// --- ROUTES ---

// 1. HEALTH & SYSTEM
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 as ok');
        res.json({ status: 'online', database: rows[0].ok === 1 });
    } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// 2. WAREHOUSES
app.get('/api/warehouses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM warehouses ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. INVENTORY (MASTER ITEM)
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, base_unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), min_stock=VALUES(min_stock), unit=VALUES(unit), base_unit=VALUES(base_unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock || 0, i.minStock, i.unit, i.baseUnit, JSON.stringify(i.conversions || []), i.price, new Date()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. TRANSACTIONS & LEDGER (THE ENGINE)
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1. Insert Transaction Record
        const sqlTx = `INSERT INTO transactions (id, type, date, from_warehouse_id, to_warehouse_id, reference_number, supplier, notes, items, performer, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await conn.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.fromWarehouseId || null, tx.toWarehouseId || null, tx.referenceNumber, tx.supplier || null, tx.notes || '', JSON.stringify(tx.items), tx.performer, JSON.stringify(tx.photos || [])]);

        // 2. Process Ledger and Update Global Inventory
        for (const item of tx.items) {
            const baseQty = item.baseQuantity || item.quantity;
            
            if (tx.type === 'IN') {
                await conn.query('INSERT INTO stock_ledger (item_id, warehouse_id, tx_id, type, quantity) VALUES (?,?,?,?,?)', [item.itemId, tx.toWarehouseId, tx.id, 'INBOUND', baseQty]);
                await conn.query('UPDATE inventory SET stock = stock + ? WHERE id = ?', [baseQty, item.itemId]);
            } 
            else if (tx.type === 'OUT') {
                await conn.query('INSERT INTO stock_ledger (item_id, warehouse_id, tx_id, type, quantity) VALUES (?,?,?,?,?)', [item.itemId, tx.fromWarehouseId, tx.id, 'OUTBOUND', baseQty]);
                await conn.query('UPDATE inventory SET stock = stock - ? WHERE id = ?', [baseQty, item.itemId]);
            }
            else if (tx.type === 'TRANSFER') {
                // Out from Source
                await conn.query('INSERT INTO stock_ledger (item_id, warehouse_id, tx_id, type, quantity) VALUES (?,?,?,?,?)', [item.itemId, tx.fromWarehouseId, tx.id, 'TRANSFER_OUT', baseQty]);
                // In to Destination
                await conn.query('INSERT INTO stock_ledger (item_id, warehouse_id, tx_id, type, quantity) VALUES (?,?,?,?,?)', [item.itemId, tx.toWarehouseId, tx.id, 'TRANSFER_IN', baseQty]);
                // Global stock doesn't change for internal transfers, but ledger tracks locations
            }
            else if (tx.type === 'ADJUST') {
                await conn.query('INSERT INTO stock_ledger (item_id, warehouse_id, tx_id, type, quantity) VALUES (?,?,?,?,?)', [item.itemId, tx.toWarehouseId || tx.fromWarehouseId, tx.id, 'ADJUSTMENT', baseQty]);
                await conn.query('UPDATE inventory SET stock = ? WHERE id = ?', [baseQty, item.itemId]); // Force set stock
            }
        }

        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ success: false, error: e.message });
    } finally { conn.release(); }
});

// 5. LEDGER REPORTS (VIRTUALIZED DATA)
app.get('/api/ledger', async (req, res) => {
    const { itemId, warehouseId } = req.query;
    try {
        let sql = 'SELECT * FROM stock_ledger';
        const params = [];
        if (itemId || warehouseId) {
            sql += ' WHERE ';
            if (itemId) { sql += 'item_id = ?'; params.push(itemId); }
            if (itemId && warehouseId) sql += ' AND ';
            if (warehouseId) { sql += 'warehouse_id = ?'; params.push(warehouseId); }
        }
        sql += ' ORDER BY timestamp DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. AUTH & USER MANAGEMENT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length) res.json({ success: true, user: toCamel(rows[0]) });
        else res.status(401).json({ success: false, message: 'Login gagal' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?,?,?,?,?,?)', [u.id, u.name, u.username, u.password, u.role, u.email]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. REJECT MODULE
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject/master', async (req, res) => {
    const i = req.body;
    try {
        await pool.query('INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?,?,?,?,?,?)', [i.id, i.name, i.sku, i.category, i.baseUnit, JSON.stringify(i.conversions || [])]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const tx = req.body;
    try {
        await pool.query('INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?,?,?,?)', [tx.id, new Date(tx.date), JSON.stringify(tx.items), new Date()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. MEDIA PLAYER
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/playlists', async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?,?,?)', [id, name, new Date()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/playlists/:id/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows.map(toCamel));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/playlists/:id/items', async (req, res) => {
    const i = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?,?,?,?,?,?)', [i.id, req.params.id, i.title, i.url, i.videoId, new Date()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. SYSTEM RESET
app.post('/api/system/reset', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE stock_ledger');
        await conn.query('TRUNCATE TABLE transactions');
        await conn.query('TRUNCATE TABLE inventory');
        await conn.query('TRUNCATE TABLE reject_transactions');
        await conn.query('TRUNCATE TABLE reject_master');
        await conn.query('TRUNCATE TABLE playlist_items');
        await conn.query('TRUNCATE TABLE playlists');
        await conn.query('DELETE FROM users WHERE username != "admin"');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.commit();
        res.json({ success: true });
    } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
    finally { conn.release(); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`WMS Backend Engine v2.5 Online at Port ${PORT}`));
