
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

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

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

// --- UTILITIES & HELPERS ---

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
    console.error("CRITICAL_ERROR:", err);
    sendRes(res, 500, false, customMsg, err.message);
};

// --- SYSTEM & HEALTH ROUTES ---

app.get('/api/health', async (req, res) => {
    let dbStatus = false;
    try {
        const [rows] = await pool.query('SELECT 1 as ok');
        if (rows && rows[0].ok === 1) dbStatus = true;
    } catch (err) {
        console.error("Health DB Error:", err.message);
        dbStatus = false;
    }
    
    sendRes(res, 200, true, "SmartInventory API Status", { 
        api: "online", 
        database: dbStatus,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// --- AUTH & USER MANAGEMENT ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            sendRes(res, 200, true, "Login sukses", toCamel(rows[0]));
        } else {
            sendRes(res, 401, false, "Kredensial tidak valid");
        }
    } catch (err) { handleError(res, err); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)', 
            [u.id, u.name, u.username, u.password, u.role, u.email]);
        sendRes(res, 201, true, "User berhasil ditambahkan");
    } catch (err) { handleError(res, err); }
});

app.put('/api/users/:id', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('UPDATE users SET name=?, username=?, password=?, role=?, email=? WHERE id=?', 
            [u.name, u.username, u.password, u.role, u.email, req.params.id]);
        sendRes(res, 200, true, "User berhasil diperbarui");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "User dihapus");
    } catch (err) { handleError(res, err); }
});

// --- INVENTORY MODULE ---

app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/inventory', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, JSON.stringify(item.conversions || []), item.price, new Date()]);
        sendRes(res, 201, true, "Barang berhasil disimpan");
    } catch (err) { handleError(res, err); }
});

app.put('/api/inventory/:id', async (req, res) => {
    const item = req.body;
    try {
        const sql = `UPDATE inventory SET name=?, sku=?, category=?, stock=?, min_stock=?, unit=?, conversions=?, price=?, last_updated=? WHERE id=?`;
        await pool.query(sql, [item.name, item.sku, item.category, item.stock, item.minStock, item.unit, JSON.stringify(item.conversions || []), item.price, new Date(), req.params.id]);
        sendRes(res, 200, true, "Barang diperbarui");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Barang dihapus");
    } catch (err) { handleError(res, err); }
});

app.post('/api/inventory/bulk-delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id IN (?)', [req.body.ids]);
        sendRes(res, 200, true, "Beberapa barang berhasil dihapus");
    } catch (err) { handleError(res, err); }
});

// --- TRANSACTION MODULE (ACID) ---

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

        // Validasi stok untuk OUT
        if (tx.type === 'OUT') {
            for (const item of tx.items) {
                const [inv] = await conn.query('SELECT stock, name FROM inventory WHERE id = ? FOR UPDATE', [item.itemId]);
                if (inv.length > 0 && inv[0].stock < item.quantity) {
                    throw new Error(`Stok tidak cukup untuk: ${inv[0].name}`);
                }
            }
        }

        // PERBAIKAN: Placeholder berjumlah 9, Parameter sekarang juga berjumlah 9
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await conn.query(sqlTx, [
            tx.id, 
            tx.type, 
            new Date(tx.date), 
            tx.referenceNumber || null, 
            tx.supplier || null, 
            tx.notes || '', 
            JSON.stringify(tx.photos || []), 
            JSON.stringify(tx.items || []), 
            tx.performer || 'Admin'
        ]);

        // Update stok
        for (const item of tx.items) {
            let updateSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(updateSql, [item.quantity, item.itemId]);
        }

        await conn.commit();
        sendRes(res, 201, true, "Transaksi berhasil");
    } catch (err) {
        if (conn) await conn.rollback();
        // Mengembalikan pesan error asli agar FE bisa menampilkan detail (misal: "Stok tidak cukup")
        sendRes(res, 400, false, err.message);
    } finally { if (conn) conn.release(); }
});

app.put('/api/transactions/:id', async (req, res) => {
    const txId = req.params.id;
    const newTx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [oldRows] = await conn.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [txId]);
        if (oldRows.length === 0) throw new Error("Transaksi tidak ditemukan");
        const oldTx = toCamel(oldRows[0]);

        for (const item of oldTx.items) {
            let revertSql = oldTx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await conn.query(revertSql, [item.quantity, item.itemId]);
        }

        const sqlUpdate = `UPDATE transactions SET date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?`;
        await conn.query(sqlUpdate, [new Date(newTx.date), newTx.referenceNumber || null, newTx.supplier || null, newTx.notes || '', JSON.stringify(newTx.photos || []), JSON.stringify(newTx.items || []), newTx.performer || 'Admin', txId]);

        for (const item of newTx.items) {
            let applySql = newTx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(applySql, [item.quantity, item.itemId]);
        }

        await conn.commit();
        sendRes(res, 200, true, "Transaksi diperbarui");
    } catch (err) {
        if (conn) await conn.rollback();
        sendRes(res, 400, false, err.message);
    } finally { if (conn) conn.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [req.params.id]);
        if (rows.length === 0) throw new Error("Transaksi tidak ditemukan");
        const tx = toCamel(rows[0]);

        for (const item of tx.items) {
            let revertSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await conn.query(revertSql, [item.quantity, item.itemId]);
        }

        await conn.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await conn.commit();
        sendRes(res, 200, true, "Transaksi dihapus dan stok dikembalikan");
    } catch (err) {
        if (conn) await conn.rollback();
        sendRes(res, 400, false, err.message);
    } finally { if (conn) conn.release(); }
});

// --- REJECT MODULE ---

app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/reject/master', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || [])]);
        sendRes(res, 201, true, "Master reject ditambahkan");
    } catch (err) { handleError(res, err); }
});

app.put('/api/reject/master/:id', async (req, res) => {
    const item = req.body;
    try {
        const sql = `UPDATE reject_master SET name=?, sku=?, category=?, base_unit=?, conversions=? WHERE id=?`;
        await pool.query(sql, [item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || []), req.params.id]);
        sendRes(res, 200, true, "Master reject diperbarui");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Master reject dihapus");
    } catch (err) { handleError(res, err); }
});
// BULK DELETE REJECT MASTER
app.delete('/api/reject/master/bulk', async (req, res) => {
    const { ids } = req.body;

    try {
        // --- VALIDASI RINGAN (NON-DESTRUCTIVE) ---
        if (!Array.isArray(ids) || ids.length === 0) {
            return sendRes(res, 400, false, "ID master reject tidak valid");
        }

        // --- EXECUTE BULK DELETE ---
        const sql = `
            DELETE FROM reject_master
            WHERE id IN (?)
        `;

        const [result] = await pool.query(sql, [ids]);

        sendRes(
            res,
            200,
            true,
            `${result.affectedRows} master reject berhasil dihapus`
        );

    } catch (err) {
        handleError(res, err);
    }
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
        sendRes(res, 201, true, "Transaksi reject dicatat");
    } catch (err) { handleError(res, err); }
});

// --- MEDIA PLAYER ---

app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/playlists', async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [id, name, new Date()]);
        sendRes(res, 201, true, "Playlist dibuat");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Playlist dihapus");
    } catch (err) { handleError(res, err); }
});

app.get('/api/playlists/:pid/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.pid]);
        res.json(rows.map(toCamel));
    } catch (err) { handleError(res, err); }
});

app.post('/api/playlists/:pid/items', async (req, res) => {
    const v = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [v.id, req.params.pid, v.title, v.url, v.videoId, new Date()]);
        sendRes(res, 201, true, "Video ditambahkan ke playlist");
    } catch (err) { handleError(res, err); }
});

app.delete('/api/playlists/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Video dihapus dari playlist");
    } catch (err) { handleError(res, err); }
});

// --- REPORTS (PDF) ---

app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type, filterType, selectedItemId } = req.body;
    try {
        const [invRows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        const [txRows] = await pool.query('SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date ASC', [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);
        const inventory = invRows.map(toCamel);
        const transactions = txRows.map(toCamel);
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${type}.pdf`);
        doc.pipe(res);
        doc.rect(0, 0, 595.28, 80).fill('#1e293b');
        doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text("SmartInventory Pro Report", 30, 25);
        doc.moveDown(5);
        if (type === 'TRANSACTIONS') {
            const tableData = [];
            transactions.forEach(t => {
                if (filterType !== 'ALL' && t.type !== filterType) return;
                t.items.forEach(item => {
                    if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;
                    tableData.push([t.date.split('T')[0], t.type, item.itemName, `${item.quantity} ${item.unit}`, t.referenceNumber || '-', t.performer || 'Admin']);
                });
            });
            await doc.table({ title: "MUTASI BARANG", headers: ["Tgl", "Tipe", "Nama", "Qty", "Ref", "User"], rows: tableData });
        }
        doc.end();
    } catch (err) { handleError(res, err); }
});

// --- SYSTEM RESET ---

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
        sendRes(res, 200, true, "Sistem berhasil direset");
    } catch (err) {
        if (conn) await conn.rollback();
        handleError(res, err);
    } finally { if (conn) conn.release(); }
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartInventory Pro API Fixed v1.0.2 - PORT ${PORT}`);
});
