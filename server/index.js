
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table');

const app = express();
const PORT = process.env.PORT || 3010;

// Konfigurasi Middleware - Support payload besar untuk foto dokumentasi
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Konfigurasi Database Pool
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

// Utility: Ubah snake_case DB ke camelCase Frontend & Parse JSON
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

// ==========================================
// 1. AUTHENTICATION
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, username, role, email FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) sendRes(res, 200, true, "Login Sukses", toCamel(rows[0]));
        else sendRes(res, 401, false, "Username atau Password salah");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.get('/api/health', (req, res) => sendRes(res, 200, true, "SmartInventory API v1.1.0: Active"));

// ==========================================
// 2. INVENTORY MASTER (CRUD)
// ==========================================
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
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), status=VALUES(status), last_updated=NOW()`;
        await pool.query(sql, [i.id, i.name, i.sku, i.category, i.stock || 0, i.minStock || 0, i.unit, JSON.stringify(i.conversions || []), i.price || 0, i.status || 'active', new Date()]);
        sendRes(res, 201, true, "Data barang berhasil disimpan");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const [usage] = await pool.query('SELECT COUNT(*) as count FROM transactions WHERE JSON_CONTAINS(items, JSON_OBJECT("itemId", ?))', [req.params.id]);
        if (usage[0].count > 0) {
            await pool.query('UPDATE inventory SET status = "inactive" WHERE id = ?', [req.params.id]);
            sendRes(res, 200, true, "Barang dinonaktifkan karena memiliki riwayat transaksi.");
        } else {
            await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
            sendRes(res, 200, true, "Barang berhasil dihapus permanen.");
        }
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/inventory/delete-bulk', async (req, res) => {
    const { ids } = req.body;
    try {
        for (const id of ids) {
            const [usage] = await pool.query('SELECT COUNT(*) as count FROM transactions WHERE JSON_CONTAINS(items, JSON_OBJECT("itemId", ?))', [id]);
            if (usage[0].count > 0) await pool.query('UPDATE inventory SET status = "inactive" WHERE id = ?', [id]);
            else await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
        }
        sendRes(res, 200, true, "Bulk delete/deactivate selesai.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// ==========================================
// 3. TRANSACTIONS (STOCK LOGIC)
// ==========================================
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
            await conn.query(`UPDATE inventory SET stock = stock ${op} ?, last_updated = NOW() WHERE id = ?`, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 201, true, "Transaksi berhasil diproses.");
    } catch (err) { 
        await conn.rollback(); 
        sendRes(res, 400, false, "Gagal memproses transaksi: " + err.message); 
    } finally { conn.release(); }
});

app.put('/api/transactions/:id', async (req, res) => {
    const tx = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // Reverse stok lama
        const [oldRows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (oldRows.length === 0) throw new Error("Transaksi tidak ditemukan");
        const oldTx = toCamel(oldRows[0]);
        for (const item of oldTx.items) {
            const op = oldTx.type === 'IN' ? '-' : '+';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        // Update transaksi & Apply stok baru
        const sqlUpdate = `UPDATE transactions SET type=?, date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?`;
        await conn.query(sqlUpdate, [tx.type, new Date(tx.date), tx.referenceNumber, tx.supplier, tx.notes, JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer, req.params.id]);
        for (const item of tx.items) {
            const op = tx.type === 'IN' ? '+' : '-';
            await conn.query(`UPDATE inventory SET stock = stock ${op} ? WHERE id = ?`, [item.quantity, item.itemId]);
        }
        await conn.commit();
        sendRes(res, 200, true, "Update transaksi berhasil.");
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
        sendRes(res, 200, true, "Transaksi dihapus & Stok telah dikembalikan.");
    } catch (err) { await conn.rollback(); sendRes(res, 400, false, err.message); }
    finally { conn.release(); }
});

// ==========================================
// 4. REJECT MODULE (STANDALONE - NO STOCK IMPACT)
// ==========================================
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
        sendRes(res, 201, true, "Master Reject berhasil disimpan.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Master Reject berhasil dihapus.");
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
        sendRes(res, 201, true, "Transaksi reject berhasil dicatat.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/reject/transactions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_transactions WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Riwayat reject berhasil dihapus.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// ==========================================
// 5. REPORTING (PDF GENERATOR)
// ==========================================
app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type, filterType, selectedItemId } = req.body;
    
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Header Laporan
        doc.fontSize(18).text('LAPORAN RESMI SMARTINVENTORY', { align: 'center' });
        doc.fontSize(10).text(`Periode: ${startDate} s/d ${endDate}`, { align: 'center' });
        doc.moveDown();

        if (type === 'TRANSACTIONS') {
            const [rows] = await pool.query('SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date ASC', [startDate + ' 00:00:00', endDate + ' 23:59:59']);
            const txs = rows.map(toCamel);
            
            const tableRows = [];
            txs.forEach(t => {
                t.items.forEach(item => {
                    if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;
                    if (filterType !== 'ALL' && t.type !== filterType) return;
                    tableRows.push([
                        t.date.split('T')[0],
                        t.type,
                        item.itemName,
                        item.quantity + ' ' + item.unit,
                        t.referenceNumber || '-',
                        t.performer
                    ]);
                });
            });

            const table = {
                title: "Detail Mutasi Barang",
                headers: ["Tanggal", "Tipe", "Barang", "Volume", "Ref", "User"],
                rows: tableRows
            };
            await doc.table(table, { width: 530 });

        } else {
            // Saldo Bulanan Logic
            const [invRows] = await pool.query('SELECT * FROM inventory');
            const items = invRows.map(toCamel);
            const [txRows] = await pool.query('SELECT * FROM transactions WHERE date <= ?', [endDate + ' 23:59:59']);
            const txs = txRows.map(toCamel);

            const reportData = items.map(item => {
                let opening = parseFloat(item.stock);
                let totalIn = 0;
                let totalOut = 0;

                txs.forEach(t => {
                    t.items.forEach(ti => {
                        if (ti.itemId === item.id) {
                            const isAfterStart = t.date >= startDate;
                            if (isAfterStart) {
                                if (t.type === 'IN') totalIn += ti.quantity;
                                else totalOut += ti.quantity;
                            }
                        }
                    });
                });

                return [item.name, item.sku, (item.stock - totalIn + totalOut).toFixed(2), totalIn.toFixed(2), totalOut.toFixed(2), item.stock.toFixed(2)];
            });

            const table = {
                title: "Ringkasan Saldo Stok",
                headers: ["Nama Barang", "SKU", "Awal", "Masuk", "Keluar", "Akhir"],
                rows: reportData
            };
            await doc.table(table, { width: 530 });
        }

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal generate laporan.");
    }
});

// ==========================================
// 6. SYSTEM MAINTENANCE
// ==========================================
app.post('/api/reset', async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions');
        await pool.query('DELETE FROM reject_transactions');
        await pool.query('DELETE FROM playlist_items');
        await pool.query('DELETE FROM playlists');
        await pool.query('UPDATE inventory SET stock = 0');
        await pool.query('DELETE FROM users WHERE username != "admin"');
        sendRes(res, 200, true, "Sistem berhasil direset ke pengaturan awal.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// ==========================================
// 7. USER MANAGEMENT (CRUD)
// ==========================================
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
        sendRes(res, 201, true, "Data user berhasil disimpan.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "User berhasil dihapus.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

// ==========================================
// 8. MEDIA PLAYER (CRUD)
// ==========================================
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.post('/api/playlists', async (req, res) => {
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, NOW())', [req.body.id, req.body.name]);
        sendRes(res, 201, true, "Playlist dibuat.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Playlist dihapus.");
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
        sendRes(res, 201, true, "Video ditambahkan.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.delete('/api/playlists/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.id]);
        sendRes(res, 200, true, "Video dihapus.");
    } catch (err) { sendRes(res, 500, false, err.message); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`SmartInventory PRO API: Running on Port ${PORT}`));
