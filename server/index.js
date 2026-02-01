
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

// --- ROUTES ---

app.get('/api/health', (req, res) => sendRes(res, 200, true, "Server Online"));

// AUTH
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) sendRes(res, 200, true, "Login Sukses", toCamel(rows[0]));
        else sendRes(res, 401, false, "Kredensial Salah");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// INVENTORY MASTER (FULL CRUD)
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY status ASC, name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, status, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), status=VALUES(status), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock || 0, i.minStock || 0, i.unit, JSON.stringify(i.conversions || []), i.price || 0, i.status || 'active', new Date()]);
        sendRes(res, 201, true, "Master Barang Disimpan");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        // Cek jika sudah ada transaksi
        const [usage] = await pool.query('SELECT COUNT(*) as count FROM transactions WHERE JSON_CONTAINS(items, JSON_OBJECT("itemId", ?))', [req.params.id]);
        if (usage[0].count > 0) {
            await pool.query('UPDATE inventory SET status = "inactive" WHERE id = ?', [req.params.id]);
            sendRes(res, 200, true, "Barang dinonaktifkan (Memiliki histori)");
        } else {
            await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
            sendRes(res, 200, true, "Barang dihapus permanen");
        }
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// Fix: Added bulk inventory deletion endpoint
app.post('/api/inventory/delete-bulk', async (req, res) => {
    const { ids } = req.body;
    try {
        for (const id of ids) {
            const [usage] = await pool.query('SELECT COUNT(*) as count FROM transactions WHERE JSON_CONTAINS(items, JSON_OBJECT("itemId", ?))', [id]);
            if (usage[0].count > 0) {
                await pool.query('UPDATE inventory SET status = "inactive" WHERE id = ?', [id]);
            } else {
                await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
            }
        }
        sendRes(res, 200, true, "Bulk operation complete");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// TRANSACTIONS (STOCK LOGIC)
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await conn.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer]);
        
        for (const item of tx.items) {
            const op = tx.type === 'IN' ? '+' : '-';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 201, true, "Transaksi Berhasil");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); }
    finally { conn.release(); }
});

// Fix: Added update transaction endpoint with stock reversal logic
app.put('/api/transactions/:id', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // 1. Get old transaction to reverse stock
        const [oldRows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (oldRows.length === 0) throw new Error("Transaksi tidak ditemukan");
        const oldTx = toCamel(oldRows[0]);
        for (const item of oldTx.items) {
            const op = oldTx.type === 'IN' ? '-' : '+';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        // 2. Update transaction record
        const sqlUpdate = `UPDATE transactions SET type=?, date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?`;
        await conn.query(sqlUpdate, [tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer, req.params.id]);
        // 3. Apply new stock
        for (const item of tx.items) {
            const op = tx.type === 'IN' ? '+' : '-';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 200, true, "Update Transaksi Berhasil");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); }
    finally { conn.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) throw new Error("Transaksi tidak ditemukan");
        const tx = toCamel(rows[0]);
        for (const item of tx.items) {
            const op = tx.type === 'IN' ? '-' : '+';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        await conn.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await conn.commit();
        sendRes(res, 200, true, "Transaksi dihapus & Stok dibalikan");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); }
    finally { conn.release(); }
});

// REJECT MODULE (STANDALONE - NO STOCK IMPACT)
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/reject/master', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), base_unit=VALUES(base_unit), conversions=VALUES(conversions), status=VALUES(status)`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.baseUnit, JSON.stringify(i.conversions || []), i.status || 'active']);
        sendRes(res, 201, true, "Master Reject Disimpan");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Master Reject Berhasil Dihapus");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const tx = req.body;
    try {
        await pool.query('INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, ?)', [tx.id, new Date(tx.date), JSON.stringify(tx.items), new Date()]);
        sendRes(res, 201, true, "Transaksi Reject Berhasil");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/transactions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_transactions WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Histori Reject Berhasil Dihapus");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// MEDIA PLAYER & PLAYLISTS
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/playlists', async (req, res) => {
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [req.body.id, req.body.name, new Date()]);
        sendRes(res, 201, true, "Playlist Dibuat");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Playlist Dihapus");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.get('/api/playlists/:id/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/playlists/:id/items', async (req, res) => {
    const v = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [v.id, req.params.id, v.title, v.url, v.videoId, new Date()]);
        sendRes(res, 201, true, "Video Ditambahkan");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlists/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Video Dihapus");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// USERS
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        const sql = `INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), email=VALUES(email), password=VALUES(password)`;
        await pool.query(sql, [u.id, u.name, u.username, u.password, u.role, u.email]);
        sendRes(res, 201, true, "User Tersimpan");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "User Dihapus");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// Fix: Added system reset endpoint
app.post('/api/reset', async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions');
        await pool.query('DELETE FROM inventory');
        await pool.query('DELETE FROM reject_transactions');
        await pool.query('DELETE FROM reject_master');
        await pool.query('DELETE FROM playlist_items');
        await pool.query('DELETE FROM playlists');
        await pool.query('DELETE FROM users WHERE username != "admin"');
        sendRes(res, 200, true, "Database Reset Success");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`SmartInventory API v1.1.0 Ready on Port ${PORT}`));