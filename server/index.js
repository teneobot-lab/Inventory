
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

// --- MIDDLEWARE ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// --- UTILITIES ---
const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    const newO = {};
    Object.keys(o).forEach(key => {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = o[key];
        const jsonFields = ['conversions', 'items', 'photos'];
        if (jsonFields.includes(newKey) || jsonFields.includes(key)) {
            if (typeof value === 'string' && value.trim() !== '') {
                try { value = JSON.parse(value); } catch (e) { value = []; }
            } else if (value === null) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

const sendRes = (res, code, success, message, data = null) => {
    res.status(code).json({ success, message, data });
};

const handleError = (res, err, customMsg = "Internal Server Error") => {
    console.error("SERVER_ERROR:", err);
    sendRes(res, 500, false, customMsg, err.message);
};

// --- ROUTES ---

app.get('/api/health', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        sendRes(res, 200, true, "Online");
    } catch (err) { handleError(res, err); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) sendRes(res, 200, true, "Login OK", toCamel(rows[0]));
        else sendRes(res, 401, false, "Kredensial salah");
    } catch (err) { handleError(res, err); }
});

// Inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock, i.minStock, i.unit, JSON.stringify(i.conversions || []), i.price, new Date()]);
        sendRes(res, 201, true, "Simpan Berhasil");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        if (result.affectedRows > 0) sendRes(res, 200, true, "Terhapus");
        else sendRes(res, 404, false, "Tidak ditemukan");
    } catch (err) { handleError(res, err); }
});

app.post('/api/inventory/bulk-delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id IN (?)', [req.body.ids]);
        sendRes(res, 200, true, "Beberapa data terhapus");
    } catch (err) { handleError(res, err); }
});

// Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await conn.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer]);
        for (const item of tx.items) {
            let updateSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(updateSql, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 201, true, "Transaksi Berhasil");
    } catch (err) { await conn.rollback(); handleError(res, err); }
    finally { conn.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) throw new Error("Tidak ditemukan");
        const tx = toCamel(rows[0]);
        for (const item of tx.items) {
            let revertSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await conn.query(revertSql, [item.quantity, item.itemId]);
        }
        await conn.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await conn.commit();
        sendRes(res, 200, true, "Terhapus");
    } catch (err) { await conn.rollback(); handleError(res, err); }
    finally { conn.release(); }
});

// Reject Module
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/reject/master', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), base_unit=VALUES(base_unit), conversions=VALUES(conversions)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || [])]);
        sendRes(res, 201, true, "Master Reject OK");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        if (result.affectedRows > 0) sendRes(res, 200, true, "Master Reject Terhapus");
        else sendRes(res, 404, false, "Tidak ditemukan");
    } catch (err) { handleError(res, err); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const tx = req.body;
    try {
        const sql = `INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, ?)`;
        await pool.query(sql, [tx.id, new Date(tx.date), JSON.stringify(tx.items || []), new Date()]);
        sendRes(res, 201, true, "Reject Tercatat");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/reject/transactions/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM reject_transactions WHERE id = ?', [req.params.id]);
        if (result.affectedRows > 0) sendRes(res, 200, true, "Transaksi Reject Terhapus");
        else sendRes(res, 404, false, "Tidak ditemukan");
    } catch (err) { handleError(res, err); }
});

// Admin Users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        const sql = `INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name=VALUES(name), username=VALUES(username), password=VALUES(password), role=VALUES(role), email=VALUES(email)`;
        await pool.query(sql, [u.id, u.name, u.username, u.password, u.role, u.email]);
        sendRes(res, 201, true, "User OK");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "User dihapus");
    } catch (err) { handleError(res, err); }
});

// Media & Report
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/playlists', async (req, res) => {
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [req.body.id, req.body.name, new Date()]);
        sendRes(res, 201, true, "Playlist Dibuat");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Playlist Dihapus");
    } catch (err) { handleError(res, err); }
});

// Added missing playlist items endpoints to fix MediaPlayer background playback and item management
app.get('/api/playlists/:id/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/playlists/:id/items', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [item.id, req.params.id, item.title, item.url, item.videoId, new Date()]);
        sendRes(res, 201, true, "Item Ditambahkan");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/playlists/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Item Terhapus");
    } catch (err) { handleError(res, err); }
});

app.post('/api/system/reset', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE transactions');
        await conn.query('TRUNCATE TABLE inventory');
        await conn.query('TRUNCATE TABLE reject_transactions');
        await conn.query('TRUNCATE TABLE reject_master');
        await conn.query('TRUNCATE TABLE playlist_items');
        await conn.query('TRUNCATE TABLE playlists');
        await conn.query('DELETE FROM users WHERE username != "admin"');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.commit();
        sendRes(res, 200, true, "Sistem Reset");
    } catch (err) { await conn.rollback(); handleError(res, err); }
    finally { conn.release(); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`SmartInventory Server on PORT ${PORT}`));
