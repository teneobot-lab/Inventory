
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

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

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) sendRes(res, 200, true, "Login Sukses", toCamel(rows[0]));
        else sendRes(res, 401, false, "Username atau Password salah");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, status, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), status=VALUES(status), last_updated=NOW()`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock || 0, i.minStock || 0, i.unit, JSON.stringify(i.conversions || []), i.price || 0, i.status || 'active']);
        sendRes(res, 201, true, "Master Data Updated");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- TRANSACTIONS ---
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
        sendRes(res, 201, true, "Transaction Success");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); } finally { conn.release(); }
});

// --- REJECT MASTER ---
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
        sendRes(res, 201, true, "Reject Master Saved");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// --- REJECT TRANSACTIONS ---
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
        sendRes(res, 201, true, "Reject Recorded");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// Endpoint baru untuk simpan editan transaksi reject
app.put('/api/reject/transactions/:id', async (req, res) => {
    const tx = req.body;
    try {
        await pool.query('UPDATE reject_transactions SET date = ?, items = ? WHERE id = ?', [new Date(tx.date), JSON.stringify(tx.items), req.params.id]);
        sendRes(res, 200, true, "Reject Transaction Updated");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/transactions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_transactions WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Reject Deleted");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`SmartInventory PRO API: ${PORT}`));
