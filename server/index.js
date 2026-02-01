
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

// --- MIDDLEWARE ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// --- DATABASE CONNECTION ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// --- UTILITIES ---
const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    const newO = {};
    Object.keys(o).forEach(key => {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = o[key];
        if (['conversions', 'items', 'photos'].includes(newKey) || ['conversions', 'items', 'photos'].includes(key)) {
            try { value = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

const sendRes = (res, code, success, message, data = null) => res.status(code).json({ success, message, data });

const handleError = (res, err, customMsg = "Internal Server Error") => {
    console.error("CRITICAL_API_ERROR:", err);
    // Hindari expose detail teknis SQL ke client
    const clientMsg = err.code === 'ER_DUP_ENTRY' ? "Data duplikat terdeteksi" : customMsg;
    sendRes(res, code >= 400 && code < 600 ? code : 500, false, clientMsg, null);
};

// --- 1. SYSTEM & HEALTH ---
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 as ok');
        sendRes(res, 200, true, "SmartInventory API Online", { database: rows[0].ok === 1 });
    } catch (e) {
        sendRes(res, 500, false, "Database Connection Failed", { database: false, error: e.message });
    }
});

// --- 2. AUTH & USERS ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length) {
            sendRes(res, 200, true, "Login sukses", toCamel(rows[0]));
        } else {
            sendRes(res, 401, false, "Username atau password salah");
        }
    } catch (e) { handleError(res, e); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    if (!u.username || !u.name) return sendRes(res, 400, false, "Username dan Nama wajib diisi");
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?,?,?,?,?,?)', [u.id, u.name, u.username, u.password, u.role, u.email]);
        sendRes(res, 201, true, "User berhasil dibuat");
    } catch (e) { handleError(res, e, "Gagal membuat user"); }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const u = req.body;

    if (!u || Object.keys(u).length === 0) return sendRes(res, 400, false, "Payload tidak boleh kosong");
    if (!u.username || !u.name) return sendRes(res, 400, false, "Data wajib (Nama/Username) tidak lengkap");

    try {
        // 1. Existence Check
        const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) return sendRes(res, 404, false, "User tidak ditemukan");

        // 2. Execute Update
        await pool.query('UPDATE users SET name=?, username=?, password=?, role=?, email=? WHERE id=?', 
            [u.name, u.username, u.password, u.role, u.email, id]);
        
        sendRes(res, 200, true, "User berhasil diperbarui");
    } catch (e) { 
        handleError(res, e, "Gagal memperbarui user"); 
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
        sendRes(res, 200, true, "User dihapus");
    } catch (e) { handleError(res, e); }
});

// --- 3. INVENTORY MODULE ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/inventory', async (req, res) => {
    const i = req.body;
    try {
        await pool.query('INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price)', 
            [i.id, i.name, i.sku, i.category, i.stock, i.minStock, i.unit, JSON.stringify(i.conversions || []), i.price, new Date()]);
        sendRes(res, 201, true, "Barang disimpan");
    } catch (e) { handleError(res, e); }
});

app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const i = req.body;

    if (!i || Object.keys(i).length === 0) return sendRes(res, 400, false, "Payload tidak boleh kosong");
    if (!i.name || !i.sku) return sendRes(res, 400, false, "Nama dan SKU wajib diisi");

    try {
        // 1. Existence Check
        const [existing] = await pool.query('SELECT id FROM inventory WHERE id = ?', [id]);
        if (existing.length === 0) return sendRes(res, 404, false, "Barang tidak ditemukan");

        // 2. Execute Update
        await pool.query('UPDATE inventory SET name=?, sku=?, category=?, stock=?, min_stock=?, unit=?, conversions=?, price=?, last_updated=? WHERE id=?', 
            [i.name, i.sku, i.category, i.stock, i.minStock, i.unit, JSON.stringify(i.conversions || []), i.price, new Date(), id]);
        
        sendRes(res, 200, true, "Data barang berhasil diperbarui");
    } catch (e) { 
        handleError(res, e, "Gagal memperbarui data barang"); 
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id=?', [req.params.id]);
        sendRes(res, 200, true, "Barang dihapus");
    } catch (e) { handleError(res, e); }
});

app.post('/api/inventory/bulk-delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id IN (?)', [req.body.ids]);
        sendRes(res, 200, true, "Bulk delete berhasil");
    } catch (e) { handleError(res, e); }
});

// --- 4. TRANSACTIONS MODULE (WITH STOCK SYNC & ATOMICITY) ---
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    if (!tx.items || tx.items.length === 0) return sendRes(res, 400, false, "Item transaksi tidak boleh kosong");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?,?,?,?,?,?,?,?,?)',
            [tx.id, tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer]);

        for (const item of tx.items) {
            const sql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(sql, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 201, true, "Transaksi dicatat dan stok diperbarui");
    } catch (e) {
        await conn.rollback();
        handleError(res, e, "Gagal mencatat transaksi");
    } finally { conn.release(); }
});

app.put('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const tx = req.body;

    if (!tx || Object.keys(tx).length === 0) return sendRes(res, 400, false, "Payload tidak boleh kosong");
    if (!tx.items || tx.items.length === 0) return sendRes(res, 400, false, "Item transaksi wajib ada");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1. Dapatkan data lama & Existence Check
        const [oldRows] = await conn.query('SELECT * FROM transactions WHERE id=?', [id]);
        if (oldRows.length === 0) {
            await conn.rollback();
            return sendRes(res, 404, false, "Transaksi tidak ditemukan");
        }

        const oldTx = toCamel(oldRows[0]);

        // 2. Reversal Stok: Batalkan efek stok dari transaksi lama
        for (const item of oldTx.items) {
            const sql = oldTx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await conn.query(sql, [item.quantity, item.itemId]);
        }

        // 3. Update data transaksi
        await conn.query('UPDATE transactions SET type=?, date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?',
            [tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer, id]);

        // 4. Apply Stok Baru: Terapkan efek stok dari data baru
        for (const item of tx.items) {
            const sql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await conn.query(sql, [item.quantity, item.itemId]);
        }

        await conn.commit();
        sendRes(res, 200, true, "Transaksi diperbarui dan stok disinkronkan");
    } catch (e) {
        await conn.rollback();
        handleError(res, e, "Gagal memperbarui transaksi (Stok gagal sinkron)");
    } finally { conn.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id=?', [id]);
        if (rows.length === 0) {
            await conn.rollback();
            return sendRes(res, 404, false, "Transaksi tidak ditemukan");
        }

        const tx = toCamel(rows[0]);
        for (const item of tx.items) {
            const sql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await conn.query(sql, [item.quantity, item.itemId]);
        }
        await conn.query('DELETE FROM transactions WHERE id=?', [id]);
        await conn.commit();
        sendRes(res, 200, true, "Transaksi dihapus dan stok dikembalikan");
    } catch (e) { await conn.rollback(); handleError(res, e); }
    finally { conn.release(); }
});

// --- 5. REJECT MODULE ---
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/reject/master', async (req, res) => {
    const i = req.body;
    try {
        await pool.query('INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?,?,?,?,?,?)',
            [i.id, i.name, i.sku, i.category, i.baseUnit, JSON.stringify(i.conversions || [])]);
        sendRes(res, 201, true, "Master Reject dibuat");
    } catch (e) { handleError(res, e); }
});

app.put('/api/reject/master/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id).replace(/:/g, '-').trim();
    const i = req.body;

    if (!i || Object.keys(i).length === 0) return sendRes(res, 400, false, "Payload tidak boleh kosong");

    try {
        // 1. Existence Check
        const [existing] = await pool.query('SELECT id FROM reject_master WHERE id = ?', [id]);
        if (existing.length === 0) return sendRes(res, 404, false, "Master reject tidak ditemukan");

        // 2. Execute Update
        await pool.query('UPDATE reject_master SET name=?, sku=?, category=?, base_unit=?, conversions=? WHERE id=?',
            [i.name, i.sku, i.category, i.baseUnit, JSON.stringify(i.conversions || []), id]);
        
        sendRes(res, 200, true, "Master Reject berhasil diperbarui");
    } catch (e) { 
        handleError(res, e, "Gagal memperbarui master reject"); 
    }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    const id = decodeURIComponent(req.params.id).replace(/:/g, '-').trim();
    try {
        await pool.query('DELETE FROM reject_master WHERE id=?', [id]);
        sendRes(res, 200, true, "Master Reject dihapus");
    } catch (e) { handleError(res, e); }
});

app.delete('/api/reject/master/bulk', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id IN (?)', [req.body.ids]);
        sendRes(res, 200, true, "Bulk delete reject berhasil");
    } catch (e) { handleError(res, e); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const t = req.body;
    try {
        await pool.query('INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?,?,?,?)',
            [t.id, new Date(t.date), JSON.stringify(t.items || []), new Date()]);
        sendRes(res, 201, true, "Transaksi Reject disimpan");
    } catch (e) { handleError(res, e); }
});

// --- 6. MEDIA PLAYER MODULE ---
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/playlists', async (req, res) => {
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?,?,?)', [req.body.id, req.body.name, new Date()]);
        sendRes(res, 201, true, "Playlist dibuat");
    } catch (e) { handleError(res, e); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id=?', [req.params.id]);
        sendRes(res, 200, true, "Playlist dihapus");
    } catch (e) { handleError(res, e); }
});

app.get('/api/playlists/:pid/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id=? ORDER BY created_at ASC', [req.params.pid]);
        res.json(rows.map(toCamel));
    } catch (e) { handleError(res, e); }
});

app.post('/api/playlists/:pid/items', async (req, res) => {
    const v = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?,?,?,?,?,?)',
            [v.id, req.params.pid, v.title, v.url, v.videoId, new Date()]);
        sendRes(res, 201, true, "Video ditambahkan");
    } catch (e) { handleError(res, e); }
});

app.delete('/api/playlists/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id=?', [req.params.id]);
        sendRes(res, 200, true, "Video dihapus");
    } catch (e) { handleError(res, e); }
});

// --- 7. REPORTS EXPORT ---
app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type } = req.body;
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${type}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text(`LAPORAN ${type}`, { align: 'center' });
        doc.fontSize(10).text(`Periode: ${startDate} s/d ${endDate}`, { align: 'center' });
        doc.moveDown();

        if (type === 'TRANSACTIONS') {
            const [rows] = await pool.query('SELECT * FROM transactions WHERE date BETWEEN ? AND ?', [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);
            const tableData = rows.flatMap(r => {
                const tx = toCamel(r);
                return tx.items.map(it => [tx.date.toISOString().split('T')[0], tx.type, it.itemName, it.quantity, it.unit]);
            });
            await doc.table({
                headers: ['Tanggal', 'Tipe', 'Nama Barang', 'Qty', 'Unit'],
                rows: tableData
            });
        }
        doc.end();
    } catch (e) { handleError(res, e); }
});

// --- 8. SYSTEM MAINTENANCE ---
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
        sendRes(res, 200, true, "Database berhasil direset");
    } catch (e) { await conn.rollback(); handleError(res, e); }
    finally { conn.release(); }
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartInventory All-in-One Backend v1.2.3 (ERP Enhanced) is running on PORT ${PORT}`);
});
