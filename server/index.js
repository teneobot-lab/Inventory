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
    queueLimit: 0,
    timezone: '+07:00' // Ensure consistent timezone
});

/**
 * Senior Utility: Robust Snake to Camel mapping with safe JSON handling.
 * This version prevents double-parsing if the DB driver already returns objects.
 */
const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    const newO = {};
    
    Object.keys(o).forEach(key => {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = o[key];

        // Handle JSON Columns (conversions, items, photos)
        const jsonFields = ['conversions', 'items', 'photos'];
        if (jsonFields.includes(newKey) || jsonFields.includes(key)) {
            if (typeof value === 'string' && value.trim().startsWith('[') || value?.trim()?.startsWith('{')) {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error(`Failed to parse JSON for key ${key}:`, e.message);
                    value = [];
                }
            } else if (value === null) {
                value = [];
            }
            // If it's already an object (mysql2 auto-parse), we keep it as is
        }

        newO[newKey] = value;
    });
    
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
        console.error("Health Check Failed:", err.message);
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
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { 
        console.error("Get Inventory Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/inventory', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [
            item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, 
            JSON.stringify(item.conversions || []), item.price, new Date()
        ]);
        res.json({ success: true });
    } catch (err) { 
        console.error("Add Inventory Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// --- TRANSACTIONS (CRITICAL FIX FOR 500 ERROR) ---
app.get('/api/transactions', async (req, res) => {
    try {
        console.log("Fetching transactions from DB...");
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
        console.log(`Found ${rows.length} transactions.`);
        
        // Transform and send
        const mappedRows = rows.map(toCamel);
        res.json(mappedRows);
    } catch (err) { 
        console.error("FATAL ERROR GET TRANSACTIONS:", err);
        res.status(500).json({ 
            success: false, 
            message: "Gagal mengambil data transaksi dari database.",
            error: err.message 
        }); 
    }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        console.log(`Processing Transaction ${tx.id}...`);

        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sqlTx, [
            tx.id, tx.type, new Date(tx.date), tx.referenceNumber || null, tx.supplier || null, tx.notes || '', 
            JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer || 'Admin'
        ]);

        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let updateSql = tx.type === 'IN' 
                ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?'
                : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            
            await connection.query(updateSql, [item.quantity, item.itemId]);
        }

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error("POST TRANSACTION ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        
        const tx = toCamel(rows[0]);
        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let revertSql = tx.type === 'IN'
                ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?'
                : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await connection.query(revertSql, [item.quantity, item.itemId]);
        }

        await connection.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error("DELETE TRANSACTION ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// --- USERS & REJECT (SIMPLIFIED FOR SPACE) ---
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server Backend running on http://localhost:${PORT}`);
});