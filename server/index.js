
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table'); // Enterprise PDF Generator

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
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// --- HELPER FUNCTIONS ---

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

// Format Currency / Number for Reports
const fmtNum = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
};

// Format Date
const fmtDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Sanitize String for PDF
const cleanStr = (str) => {
    if (str === null || str === undefined) return "";
    return String(str).replace(/(\r\n|\n|\r)/gm, " ").trim();
};

// --- AUTO MIGRATION / INITIALIZATION ---
const initDatabase = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("Checking database schema...");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS playlists (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                created_at DATETIME
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS playlist_items (
                id VARCHAR(50) PRIMARY KEY,
                playlist_id VARCHAR(50),
                title VARCHAR(255),
                url VARCHAR(255),
                video_id VARCHAR(50),
                created_at DATETIME,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                username VARCHAR(50) UNIQUE,
                password VARCHAR(255),
                role VARCHAR(20),
                email VARCHAR(100)
            )
        `);

        await connection.query(`
            INSERT IGNORE INTO users (id, name, username, password, role, email) 
            VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')
        `);

        console.log("Database schema initialized successfully.");
    } catch (err) {
        console.error("Database Initialization Failed:", err);
    } finally {
        if (connection) connection.release();
    }
};

// --- ROUTES ---

app.get('/', (req, res) => {
    res.json({ message: "SmartInventory API Server Running" });
});

app.get('/api/health', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.ping();
        res.json({ status: 'online', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
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

app.post('/api/inventory/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    try {
        await pool.query('DELETE FROM inventory WHERE id IN (?)', [ids]);
        res.json({ success: true, count: ids.length });
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

app.put('/api/transactions/:id', async (req, res) => {
    const txId = req.params.id;
    const newTx = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [oldRows] = await connection.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [txId]);
        if (oldRows.length === 0) throw new Error("Transaction not found");
        const oldTx = toCamel(oldRows[0]);
        const oldItems = Array.isArray(oldTx.items) ? oldTx.items : [];
        for (const item of oldItems) {
            let revertSql = oldTx.type === 'IN' ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await connection.query(revertSql, [item.quantity, item.itemId]);
        }
        const updateSql = `UPDATE transactions SET date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?`;
        await connection.query(updateSql, [new Date(newTx.date), newTx.referenceNumber || null, newTx.supplier || null, newTx.notes || '', JSON.stringify(newTx.photos || []), JSON.stringify(newTx.items || []), newTx.performer || 'Admin', txId]);
        const newItems = Array.isArray(newTx.items) ? newTx.items : [];
        for (const item of newItems) {
            let applySql = newTx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await connection.query(applySql, [item.quantity, item.itemId]);
        }
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
        const tx = toCamel(rows[0]);
        const txItems = Array.isArray(tx.items) ? tx.items : [];
        for (const item of txItems) {
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

app.put('/api/reject/master/:id', async (req, res) => {
    const item = req.body;
    try {
        const sql = `UPDATE reject_master SET name=?, sku=?, category=?, base_unit=?, conversions=? WHERE id=?`;
        await pool.query(sql, [item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || []), req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRITICAL FIX: Missing DELETE route for Reject Master
app.delete('/api/reject/master/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// --- PLAYLIST / MEDIA PLAYER ---
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists', async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [id, name, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/playlists/:id/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists/:id/items', async (req, res) => {
    const { id, title, url, videoId } = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [id, req.params.id, title, url, videoId, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/items/:itemId', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.itemId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- REPORT GENERATION ---
app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type, filterType, selectedItemId } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: "Periode tanggal wajib diisi." });

    try {
        const [inventoryRows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        const [txRows] = await pool.query('SELECT * FROM transactions ORDER BY date ASC'); 
        const items = inventoryRows.map(toCamel);
        const transactions = txRows.map(toCamel);

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Laporan_${type}_${startDate}.pdf`);
        doc.pipe(res);

        const drawHeader = () => {
            doc.rect(0, 0, 595.28, 100).fill('#1e293b');
            doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text("SmartInventory", 30, 30);
            doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1').text("Jalan Gudang Utama No. 123, Jakarta Selatan", 30, 55).text("Email: support@smartinventory.com", 30, 68);
            doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(type === 'TRANSACTIONS' ? "LAPORAN MUTASI" : "SALDO STOK", 0, 30, { align: 'right', width: 535 });
            doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1').text(`Periode: ${fmtDate(startDate)} - ${fmtDate(endDate)}`, 0, 55, { align: 'right', width: 535 });
        };
        
        drawHeader();
        doc.moveDown(6);

        if (type === 'TRANSACTIONS') {
            const reportData = [];
            transactions.forEach(t => {
                const tDate = t.date.split('T')[0];
                if (tDate < startDate || tDate > endDate) return;
                if (filterType !== 'ALL' && t.type !== filterType) return;
                t.items.forEach(item => {
                    if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;
                    reportData.push({
                        date: cleanStr(fmtDate(t.date)),
                        id: cleanStr(t.id),
                        type: cleanStr(t.type),
                        ref: t.type === 'IN' ? cleanStr(t.supplier) : cleanStr(t.referenceNumber),
                        item: cleanStr(item.itemName),
                        qty: `${cleanStr(item.quantity)} ${cleanStr(item.unit)}`,
                        notes: cleanStr(t.notes)
                    });
                });
            });

            const table = {
                headers: [
                    { label: "Tanggal", property: 'date', width: 65 },
                    { label: "ID TX", property: 'id', width: 80 },
                    { label: "Tipe", property: 'type', width: 40 },
                    { label: "Ref / Supplier", property: 'ref', width: 90 },
                    { label: "Nama Barang", property: 'item', width: 110 },
                    { label: "Qty", property: 'qty', width: 60, align: 'right' },
                    { label: "Ket", property: 'notes', width: 80 }
                ],
                datas: reportData 
            };

            if (reportData.length === 0) doc.fontSize(12).fillColor('#64748b').text("Tidak ada transaksi pada periode ini.", { align: 'center' });
            else await doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF"),
                prepareRow: (row, indexColumn, indexRow, rectRow) => {
                    doc.font("Helvetica").fontSize(8).fillColor("#000000");
                    if (indexRow % 2 === 0) doc.addBackground(rectRow, '#F1F5F9', 1); 
                },
            });

        } else {
            const periodStart = new Date(startDate);
            const periodEnd = new Date(endDate);
            const balanceRows = items.map(item => {
                let inAfterStart = 0;
                let outAfterStart = 0;
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= periodStart) {
                        t.items.forEach(ti => {
                            if (ti.itemId === item.id) {
                                if (t.type === 'IN') inAfterStart += ti.quantity;
                                else outAfterStart += ti.quantity;
                            }
                        });
                    }
                });
                const openingBalance = Number((item.stock - inAfterStart + outAfterStart).toFixed(3));
                let totalInPeriod = 0;
                let totalOutPeriod = 0;
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= periodStart && tDate <= periodEnd) {
                        t.items.forEach(ti => {
                            if (ti.itemId === item.id) {
                                if (t.type === 'IN') totalInPeriod += ti.quantity;
                                else totalOutPeriod += ti.quantity;
                            }
                        });
                    }
                });
                const closingBalance = Number((openingBalance + totalInPeriod - totalOutPeriod).toFixed(3));
                if (selectedItemId !== 'ALL' && item.id !== selectedItemId) return null;
                return {
                    sku: cleanStr(item.sku),
                    name: cleanStr(item.name),
                    unit: cleanStr(item.unit),
                    opening: fmtNum(openingBalance),
                    in: fmtNum(totalInPeriod),
                    out: fmtNum(totalOutPeriod),
                    closing: fmtNum(closingBalance)
                };
            }).filter(Boolean);

            const table = {
                headers: [
                    { label: "SKU", property: 'sku', width: 60 },
                    { label: "Nama Barang", property: 'name', width: 140 },
                    { label: "Satuan", property: 'unit', width: 40 },
                    { label: "Saldo Awal", property: 'opening', width: 70, align: 'right' },
                    { label: "Masuk (+)", property: 'in', width: 70, align: 'right' },
                    { label: "Keluar (-)", property: 'out', width: 70, align: 'right' },
                    { label: "Saldo Akhir", property: 'closing', width: 80, align: 'right' }
                ],
                datas: balanceRows
            };

            if (balanceRows.length === 0) doc.fontSize(12).fillColor('#64748b').text("Tidak ada data inventaris ditemukan.", { align: 'center' });
            else await doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF"),
                prepareRow: (row, indexColumn, indexRow, rectRow) => {
                    doc.font("Helvetica").fontSize(8).fillColor("#000000");
                    if (indexRow % 2 === 0) doc.addBackground(rectRow, '#F1F5F9', 1);
                },
            });
        }

        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.moveTo(30, doc.page.height - 50).lineTo(doc.page.width - 30, doc.page.height - 50).strokeColor('#e2e8f0').stroke();
            doc.fontSize(8).fillColor('#94a3b8').text(`Generated by SmartInventory System on ${new Date().toLocaleString('id-ID')}`, 30, doc.page.height - 40);
            doc.text(`Page ${i + 1} of ${pageCount}`, doc.page.width - 100, doc.page.height - 40, { align: 'right' });
        }
        doc.end();

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Gagal membuat PDF. " + err.message });
    }
});

// --- SYSTEM RESET ---
app.post('/api/system/reset', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('TRUNCATE TABLE transactions');
        await connection.query('TRUNCATE TABLE inventory');
        await connection.query('TRUNCATE TABLE reject_transactions');
        await connection.query('TRUNCATE TABLE reject_master');
        await connection.query('DELETE FROM users');
        await connection.query("INSERT INTO users (id, name, username, password, role, email) VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')");
        await connection.commit();
        res.json({ success: true, message: "Database has been reset." });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SmartInventory Backend listening on PORT ${PORT}`);
    });
});
