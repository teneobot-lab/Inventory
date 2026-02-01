
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Connection Pool
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
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
            if (typeof value === 'string') {
                try { value = JSON.parse(value.trim()); } catch (e) { value = []; }
            } else if (value === null) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

// Standard API Response Wrapper
const sendResponse = (res, statusCode, success, message, data = null) => {
    res.status(statusCode).json({ success, message, data });
};

// Generic Error Handler (Production Ready)
const handleError = (res, err, customMessage = "Terjadi kesalahan internal pada server") => {
    console.error("DEBUG_ERROR:", err); // Log full error on server
    sendResponse(res, 500, false, customMessage, process.env.NODE_ENV === 'development' ? err.message : null);
};

// --- ROUTES ---

app.get('/api/health', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.ping();
        sendResponse(res, 200, true, "Server & Database Online", { timestamp: new Date() });
    } catch (err) {
        handleError(res, err, "Gagal terhubung ke Database");
    } finally {
        if (conn) conn.release();
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            sendResponse(res, 200, true, "Login Berhasil", toCamel(rows[0]));
        } else {
            sendResponse(res, 401, false, "Username atau Password salah");
        }
    } catch (err) { handleError(res, err); }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        sendResponse(res, 200, true, "Data Inventory", rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/inventory', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, JSON.stringify(item.conversions || []), item.price, new Date()]);
        sendResponse(res, 201, true, "Item berhasil disimpan");
    } catch (err) { handleError(res, err); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1. Check stock sufficiency for OUT transactions
        if (tx.type === 'OUT') {
            for (const item of tx.items) {
                const [inv] = await conn.query('SELECT stock, name FROM inventory WHERE id = ?', [item.itemId]);
                if (inv.length > 0 && inv[0].stock < item.quantity) {
                    throw new Error(`Stok tidak cukup untuk: ${inv[0].name}. Sisa: ${inv[0].stock}`);
                }
            }
        }

        // 2. Insert Transaction Record
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await conn.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.referenceNumber || null, tx.supplier || null, tx.notes || '', JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer || 'Admin']);

        // 3. Update Inventory Stock
        for (const item of tx.items) {
            let updateSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(updateSql, [item.quantity, item.itemId]);
        }
        
        await conn.commit();
        sendResponse(res, 201, true, "Transaksi Berhasil Dicatat");
    } catch (err) {
        await conn.rollback();
        sendResponse(res, 400, false, err.message);
    } finally { conn.release(); }
});

app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        sendResponse(res, 200, true, "Data Master Reject", rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        if (result.affectedRows > 0) {
            sendResponse(res, 200, true, "Master Reject Berhasil Dihapus");
        } else {
            sendResponse(res, 404, false, "Item tidak ditemukan");
        }
    } catch (err) { handleError(res, err); }
});

// Start Server
pool.getConnection().then(conn => {
    console.log("Connected to MySQL Database.");
    conn.release();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SmartInventory API Server Running on PORT ${PORT}`);
    });
}).catch(err => {
    console.error("Critical Database Error:", err);
    process.exit(1);
});
