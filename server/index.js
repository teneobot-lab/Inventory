
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

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
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00',
    charset: 'utf8mb4',
    connectTimeout: 15000 // Menambah timeout untuk stabilitas di VPS
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
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                    try { value = JSON.parse(trimmed); } catch (e) { value = []; }
                }
            } else if (value === null) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

// --- ROUTES ---

app.get('/', (req, res) => {
    res.json({
        message: "SmartInventory API is Running",
        version: "1.0.2",
        db_user: process.env.DB_USER,
        endpoint: "/api/health"
    });
});

app.get('/api/health', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.ping();
        res.json({ 
            status: 'online', 
            database: 'connected', 
            user: dbConfig.user,
            timestamp: new Date() 
        });
    } catch (err) {
        console.error("Critical Database Error:", err.message);
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed', 
            error_code: err.code,
            details: err.message,
            config_debug: {
                host: dbConfig.host,
                user: dbConfig.user,
                database: dbConfig.database,
                has_password: dbConfig.password !== ''
            },
            tip: "Cek apakah user 'angkringan_user' memiliki izin akses ke database 'smart_inventory'."
        });
    } finally {
        if (connection) connection.release();
    }
});

// --- AUTH & USERS ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: toCamel(rows[0]) });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)', [u.id, u.name, u.username, u.password, u.role, u.email]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, JSON.stringify(item.conversions || []), item.price, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.referenceNumber || null, tx.supplier || null, tx.notes || '', JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer || 'Admin']);

        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let updateSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await connection.query(updateSql, [item.quantity, item.itemId]);
        }
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Not found" });
        const tx = toCamel(rows[0]);
        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let revertSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await connection.query(revertSql, [item.quantity, item.itemId]);
        }
        await connection.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

// --- REJECT MODULE ---
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject/master', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || [])]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const tx = req.body;
    try {
        const sql = `INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, ?)`;
        await pool.query(sql, [tx.id, new Date(tx.date), JSON.stringify(tx.items || []), new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartInventory Backend is listening on 0.0.0.0:${PORT}`);
});
