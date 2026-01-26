require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const toCamel = (o) => {
    if (!o) return null;
    const newO = {};
    for (const key in o) {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newO[newKey] = o[key];
        // Handle JSON Columns
        if (['conversions', 'items', 'photos'].includes(newKey) && typeof o[key] === 'string') {
             try { newO[newKey] = JSON.parse(o[key]); } catch(e) { newO[newKey] = []; }
        } else if (['conversions', 'items', 'photos'].includes(newKey) && typeof o[key] === 'object' && o[key] !== null) {
             newO[newKey] = o[key];
        }
    }
    return newO;
};

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        res.json({ status: 'online', db: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
    }
});

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?', 
            [username, password]
        );
        if (rows.length > 0) {
            res.json({ success: true, user: toCamel(rows[0]) });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [
            item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, 
            JSON.stringify(item.conversions || []), item.price, new Date(item.lastUpdated)
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventory/:id', async (req, res) => {
    const item = req.body;
    try {
        const sql = `UPDATE inventory SET name=?, sku=?, category=?, stock=?, min_stock=?, unit=?, conversions=?, price=?, last_updated=? WHERE id=?`;
        await pool.query(sql, [
            item.name, item.sku, item.category, item.stock, item.minStock, item.unit, 
            JSON.stringify(item.conversions || []), item.price, new Date(item.lastUpdated), req.params.id
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TRANSACTIONS (FULL CRUD) ---
app.get('/api/transactions', async (req, res) => {
    try {
        // Ensure newest is always first at DB level
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        console.log(`Menyimpan Transaksi ${tx.id} [${tx.type}]...`);

        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sqlTx, [
            tx.id, tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, 
            JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer
        ]);

        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let updateSql = '';
            if (tx.type === 'IN') {
                updateSql = 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            } else {
                updateSql = 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            }
            await connection.query(updateSql, [item.quantity, item.itemId]);
        }

        await connection.commit();
        console.log(`Transaksi ${tx.id} berhasil disimpan dan stok diperbarui.`);
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error("TRANSACTION DB ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    const tx = req.body;
    try {
        const sql = `UPDATE transactions SET date=?, reference_number=?, supplier=?, notes=?, photos=?, items=? WHERE id=?`;
        await pool.query(sql, [
             new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, 
             JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), req.params.id
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Ambil data lama untuk Reversal Stok
        const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        
        const tx = toCamel(rows[0]);
        const items = Array.isArray(tx.items) ? tx.items : [];
        
        // 2. Balikkan Stok (Reversal)
        for (const item of items) {
            let revertSql = '';
            if (tx.type === 'IN') {
                revertSql = 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            } else {
                revertSql = 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            }
            await connection.query(revertSql, [item.quantity, item.itemId]);
        }

        // 3. Hapus Record
        await connection.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// --- REJECT ---
app.get('/api/reject-master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject-master', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [
            item.id, item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || [])
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/reject-master/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reject-transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject-transactions', async (req, res) => {
    const tx = req.body;
    try {
        const sql = `INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, ?)`;
        await pool.query(sql, [
            tx.id, new Date(tx.date), JSON.stringify(tx.items || []), new Date(tx.createdAt)
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        const sql = `INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [u.id, u.name, u.username, u.password, u.role, u.email]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const u = req.body;
    try {
        const sql = `UPDATE users SET name=?, username=?, password=?, role=?, email=? WHERE id=?`;
        await pool.query(sql, [u.name, u.username, u.password, u.role, u.email, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server Backend running on http://localhost:${PORT}`);
});