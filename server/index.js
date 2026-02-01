
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware - Dukungan payload besar untuk foto dokumentasi
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// Helper: Transformasi snake_case ke camelCase & Parse JSON otomatis
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

// --- 1. AUTH & HEALTH ---
app.get('/api/health', (req, res) => res.json({ status: 'online' }));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) sendRes(res, 200, true, "Login Sukses", toCamel(rows[0]));
        else sendRes(res, 401, false, "Username atau Password salah");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 2. INVENTORY MASTER ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=NOW()`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock || 0, i.minStock || 0, i.unit, JSON.stringify(i.conversions || []), i.price || 0]);
        sendRes(res, 201, true, "Inventory Updated");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Deleted");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 3. TRANSAKSI MASUK/KELUAR ---
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
        sendRes(res, 201, true, "Transaction Saved");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); } finally { conn.release(); }
});

// --- 4. REJECT MODULE (MASTER & TRANSAKSI) ---
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/reject/master', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) 
                     VALUES (?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), base_unit=VALUES(base_unit), conversions=VALUES(conversions)`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.baseUnit, JSON.stringify(i.conversions || [])]);
        sendRes(res, 201, true, "Reject Master Saved");
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
        await pool.query('INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, NOW())', [tx.id, new Date(tx.date), JSON.stringify(tx.items)]);
        sendRes(res, 201, true, "Reject Saved");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.put('/api/reject/transactions/:id', async (req, res) => {
    const tx = req.body;
    try {
        await pool.query('UPDATE reject_transactions SET date = ?, items = ? WHERE id = ?', [new Date(tx.date), JSON.stringify(tx.items), req.params.id]);
        sendRes(res, 200, true, "Reject Updated Successfully");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/transactions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_transactions WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Deleted");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 5. ADMIN: USER MANAGEMENT ---
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role), email=VALUES(email)', [u.id, u.name, u.username, u.password, u.role, u.email]);
        sendRes(res, 201, true, "User Saved");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.put('/api/users/:id', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('UPDATE users SET name=?, username=?, password=?, role=?, email=? WHERE id=?', [u.name, u.username, u.password, u.role, u.email, req.params.id]);
        sendRes(res, 200, true, "User Updated");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "User Deleted");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 6. ADMIN: SYSTEM MAINTENANCE ---
app.post('/api/system/reset', async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions');
        await pool.query('DELETE FROM reject_transactions');
        await pool.query('DELETE FROM playlist_items');
        await pool.query('DELETE FROM playlists');
        await pool.query('UPDATE inventory SET stock = 0');
        await pool.query('DELETE FROM users WHERE username != "admin"');
        sendRes(res, 200, true, "System Reset Success");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 7. MEDIA PLAYER ---
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/playlists', async (req, res) => {
    try {
        const id = `PL-${Date.now()}`;
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, NOW())', [id, req.body.name]);
        sendRes(res, 201, true, "Playlist Created");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Deleted");
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
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [v.id, req.params.id, v.title, v.url, v.videoId]);
        sendRes(res, 201, true, "Item Added");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlist-items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Item Deleted");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- 8. REPORTS ---
app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type, filterType, selectedItemId } = req.body;
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        doc.fontSize(18).text('LAPORAN RESMI SMARTINVENTORY', { align: 'center' });
        doc.fontSize(10).text(`Periode: ${startDate} s/d ${endDate}`, { align: 'center' }).moveDown();

        const [rows] = await pool.query('SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date ASC', [startDate + ' 00:00:00', endDate + ' 23:59:59']);
        const txs = rows.map(toCamel);
        const tableRows = [];

        txs.forEach(t => {
            t.items.forEach(item => {
                if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;
                if (filterType !== 'ALL' && t.type !== filterType) return;
                tableRows.push([t.date.split('T')[0], t.type, item.itemName, item.quantity + ' ' + item.unit, t.performer]);
            });
        });

        const table = { title: "Daftar Mutasi", headers: ["Tgl", "Tipe", "Barang", "Qty", "User"], rows: tableRows };
        await doc.table(table, { width: 530 });
        doc.end();
    } catch (err) { res.status(500).send("PDF Error"); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`SmartInventory PRO API: Running on Port ${PORT}`));
